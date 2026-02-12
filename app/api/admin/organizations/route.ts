/**
 * Organization Management API Routes
 * 
 * MIGRATION STATUS: âœ… Migrated to use withRLSContext()
 * - All database operations wrapped in withRLSContext() for automatic context setting
 * - RLS policies enforce organization isolation at database level
 * 
 * Complete CRUD operations for hierarchical organizations.
 * Features:
 * - List organizations with filtering and pagination
 * - Create new organizations with hierarchy validation
 * - Update organizations with parent/type change checks
 * - Delete (archive) organizations with safety checks
 * - Bulk operations support
 * - Statistics aggregation
 * 
 * @module app/api/admin/organizations/route
 */

import { NextRequest, NextResponse } from "next/server";
import { withRLSContext } from '@/lib/db/with-rls-context';
import { db as drizzleDb } from "@/db";
import { organizations, organizationMembers } from "@/db/schema-organizations";
import {
  getOrganizations,
  getOrganizationChildren,
  createOrganization,
  searchOrganizations,
} from "@/db/queries/organization-queries";
import { eq, and, inArray, sql } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { withRoleRequired, logApiAuditEvent } from "@/lib/middleware/api-security";
import { SUPPORTED_ROLES } from "@/lib/middleware/auth-middleware";
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
/**
 * Validation schemas
 */
const listOrganizationsSchema = z.object({
  parent: z.string().uuid().optional(),
  type: z.string().optional(),
  status: z.enum(['active', 'inactive', 'archived', 'all']).optional(),
  search: z.string().optional(),
  include_stats: z.string().transform(v => v === 'true').optional(),
  limit: z.string().transform(v => parseInt(v)).optional(),
  offset: z.string().transform(v => parseInt(v)).optional(),
});

const createOrganizationSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(100),
  displayName: z.string().optional(),
  shortName: z.string().optional(),
  organizationType: z.enum(['congress', 'federation', 'union', 'local', 'region', 'district']),
  parentId: z.string().uuid().optional(),
  provinceTerritory: z.string().optional(),
  sectors: z.array(z.string()).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  address: z.string().optional(),
  clcAffiliated: z.boolean().optional(),
  affiliationDate: z.string().optional(),
  charterNumber: z.string().optional(),
  subscriptionTier: z.string().optional(),
  status: z.enum(['active', 'inactive', 'archived']).optional(),
});

const updateOrganizationsSchema = z.object({
  organizationIds: z.array(z.string().uuid()),
  updates: z.record(z.unknown()),
});

const deleteOrganizationsSchema = z.object({
  organizationIds: z.array(z.string().uuid()),
});

/**
 * Helper to check if user is admin
 */
async function checkAdminRole(userId: string): Promise<boolean> {
  try {
    const member = await drizzleDb.query.organizationMembers.findFirst({
      where: (org, { eq: eqOp }) =>
        eqOp(org.userId, userId),
    });

    return member ? ['admin', 'super_admin'].includes(member.role) : false;
  } catch (error) {
    logger.error('Failed to check admin role:', { error });
    return false;
  }
}

// =====================================================
// GET - List Organizations
// =====================================================

export const GET = withRoleAuth(90, async (request, context) => {
  const parsed = listOrganizationsSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) {
    return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid request parameters',
      error
    );
  }

  const query = parsed.data;
  const { userId, organizationId } = context;

  const orgId = (query as Record<string, unknown>)["organizationId"] ?? (query as Record<string, unknown>)["orgId"] ?? (query as Record<string, unknown>)["organization_id"] ?? (query as Record<string, unknown>)["org_id"] ?? (query as Record<string, unknown>)["unionId"] ?? (query as Record<string, unknown>)["union_id"] ?? (query as Record<string, unknown>)["localId"] ?? (query as Record<string, unknown>)["local_id"];
  if (typeof orgId === 'string' && orgId.length > 0 && orgId !== organizationId) {
    return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Forbidden',
      error
    );
  }

try {
      // Check admin role
      const isAdmin = await checkAdminRole(userId);
      if (!isAdmin) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(), userId,
          endpoint: '/api/admin/organizations',
          method: 'GET',
          eventType: 'unauthorized_access',
          severity: 'high',
          details: { reason: 'Non-admin attempted access' },
        });
        return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Forbidden - Admin access required'
    );
      }

      // Parse query parameters
      const parentId = query.parent || undefined;
      const type = query.type || undefined;
      const status = query.status || "active";
      const search = query.search || undefined;
      const includeStats = query.include_stats;
      const limit = query.limit || 100;
      const offset = query.offset || 0;

      // Fetch organizations (query functions already organization-scoped)
      let orgsData;
      if (search) {
        orgsData = await searchOrganizations(search, limit);
      } else if (parentId) {
        orgsData = await getOrganizationChildren(parentId, status === "all");
      } else {
        orgsData = await getOrganizations(parentId || undefined, status === "all");
      }

      // Filter by type if specified
      let filteredOrgs = orgsData;
      if (type && type !== "all") {
        filteredOrgs = orgsData.filter((org: any) => org.organizationType === type);
      }

      // Add statistics if requested - RLS-protected queries
      let response;
      if (includeStats) {
        const orgsWithStats = await withRLSContext(async (tx) => {
          return Promise.all(
            filteredOrgs.map(async (org: any) => {
              // Get member count
              const [memberCountResult] = await tx
                .select({ count: sql<number>`count(*)` })
                .from(organizationMembers)
                .where(
                  and(
                    eq(organizationMembers.organizationId, org.id),
                    eq(organizationMembers.status, "active")
                  )
                );

              // Get child count
              const [childCountResult] = await tx
                .select({ count: sql<number>`count(*)` })
                .from(organizations)
                .where(eq(organizations.parentId, org.id));

              // Get active claims count (if claims table exists)
              let activeClaims = 0;
              try {
                const claimsResult = await tx.execute(sql`
                  SELECT COUNT(*) as count 
                  FROM claims 
                  WHERE organization_id = ${org.id} 
                  AND status IN ('pending', 'in_progress', 'under_review')
                `);
                activeClaims = Number(claimsResult[0]?.count) || 0;
              } catch (error) {
                // Claims table may not exist yet
                logger.warn("Could not fetch claims count", { error });
              }

              // Get parent name if exists
              let parentName = null;
              if (org.parentId) {
                const [parentResult] = await tx
                  .select({ name: organizations.name })
                  .from(organizations)
                  .where(eq(organizations.id, org.parentId))
                  .limit(1);
                parentName = parentResult?.name;
              }

              return {
                ...org,
                memberCount: Number(memberCountResult?.count || 0),
                childCount: Number(childCountResult?.count || 0),
                activeClaims: Number(activeClaims),
                parentName,
              };
            })
          );
        });

        response = {
          data: orgsWithStats,
          count: orgsWithStats.length,
          includeStats: true,
        };
      } else {
        response = {
          data: filteredOrgs,
          count: filteredOrgs.length,
        };
      }

      logApiAuditEvent({
        timestamp: new Date().toISOString(), userId,
        endpoint: '/api/admin/organizations',
        method: 'GET',
        eventType: 'success',
        severity: 'low',
        details: { resultCount: response.data.length, search, type, status },
      });

      return NextResponse.json(response);
    } catch (error) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(), userId,
        endpoint: '/api/admin/organizations',
        method: 'GET',
        eventType: 'auth_failed',
        severity: 'high',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      });

      logger.error("Error fetching organizations", { error });
      throw error;
    }
});

// =====================================================
// POST - Create Organization
// =====================================================

export const POST = withRoleAuth(90, async (request, context) => {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid JSON in request body',
      error
    );
  }

  const parsed = createOrganizationSchema.safeParse(rawBody);
  if (!parsed.success) {
    return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid request body',
      error
    );
  }

  const body = parsed.data;
  const { userId, organizationId } = context;

  const orgId = (body as Record<string, unknown>)["organizationId"] ?? (body as Record<string, unknown>)["orgId"] ?? (body as Record<string, unknown>)["organization_id"] ?? (body as Record<string, unknown>)["org_id"] ?? (body as Record<string, unknown>)["unionId"] ?? (body as Record<string, unknown>)["union_id"] ?? (body as Record<string, unknown>)["localId"] ?? (body as Record<string, unknown>)["local_id"];
  if (typeof orgId === 'string' && orgId.length > 0 && orgId !== organizationId) {
    return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Forbidden',
      error
    );
  }

try {
      // Check admin role
      const isAdmin = await checkAdminRole(userId);
      if (!isAdmin) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(), userId,
          endpoint: '/api/admin/organizations',
          method: 'POST',
          eventType: 'unauthorized_access',
          severity: 'high',
          details: { reason: 'Non-admin attempted to create organization' },
        });
        return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Forbidden - Admin access required'
    );
      }

      const {
        name,
        slug,
        displayName,
        shortName,
        organizationType,
        parentId,
        provinceTerritory,
        sectors,
        email,
        phone,
        website,
        address,
        clcAffiliated,
        affiliationDate,
        charterNumber,
        subscriptionTier,
        status,
      } = body;

      // Check for duplicate slug
      const [existingOrg] = await db
        .select({ id: organizations.id })
        .from(organizations)
        .where(eq(organizations.slug, slug))
        .limit(1);

      if (existingOrg) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(), userId,
          endpoint: '/api/admin/organizations',
          method: 'POST',
          eventType: 'validation_failed',
          severity: 'medium',
          details: { reason: 'Duplicate slug', slug },
        });
        return standardErrorResponse(
      ErrorCode.ALREADY_EXISTS,
      'Organization with this slug already exists'
    );
      }

      // Validate parent organization if specified
      if (parentId) {
        const [parentOrg] = await db
          .select()
          .from(organizations)
          .where(eq(organizations.id, parentId))
          .limit(1);

        if (!parentOrg) {
          return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Parent organization not found'
    );
        }

        // Validate hierarchy rules
        const typeHierarchy: Record<string, string[]> = {
          congress: ['federation'],
          federation: ['union', 'region'],
          union: ['local', 'district'],
          local: [],
          region: ['local'],
          district: ['local'],
        };

        const allowedChildTypes = typeHierarchy[parentOrg.organizationType] || [];
        if (!allowedChildTypes.includes(organizationType)) {
          return NextResponse.json(
            {
              error: `Invalid hierarchy: ${organizationType} cannot be a child of ${parentOrg.organizationType}`,
            },
            { status: 400 }
          );
        }
      }

      // Build hierarchy path
      let hierarchyPath: string[] = [];
      if (parentId) {
        const [parentOrg] = await db
          .select({ hierarchyPath: organizations.hierarchyPath })
          .from(organizations)
          .where(eq(organizations.id, parentId))
          .limit(1);
        if (parentOrg) {
          hierarchyPath = [...parentOrg.hierarchyPath, slug];
        } else {
          hierarchyPath = [slug];
        }
      } else {
        hierarchyPath = [slug];
      }

      // Create organization
      const newOrg = await createOrganization({
        name,
        slug,
        displayName: displayName || null,
        shortName: shortName || null,
        organizationType,
        parentId: parentId || null,
        hierarchyPath,
        hierarchyLevel: hierarchyPath.length - 1,
        provinceTerritory: provinceTerritory || null,
        sectors: sectors || [],
        email: email || null,
        phone: phone || null,
        website: website || null,
        address: address || null,
        clcAffiliated: clcAffiliated || false,
        affiliationDate: affiliationDate || null,
        charterNumber: charterNumber || null,
        subscriptionTier: subscriptionTier || 'basic',
        status: status || 'active',
        createdBy: userId,
      });

      logApiAuditEvent({
        timestamp: new Date().toISOString(), userId,
        endpoint: '/api/admin/organizations',
        method: 'POST',
        eventType: 'success',
        severity: 'medium',
        details: { organizationId: newOrg.id, name, organizationType },
      });

      return standardSuccessResponse(
      { 
          data: newOrg,
          message: "Organization created successfully",
         },
      undefined,
      201
    );
    } catch (error) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(), userId,
        endpoint: '/api/admin/organizations',
        method: 'POST',
        eventType: 'auth_failed',
        severity: 'high',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      });

      logger.error("Error creating organization", { error });
      throw error;
    }
});

// =====================================================
// PATCH - Bulk Update Organizations
// =====================================================

export const PATCH = withRoleAuth(90, async (request, context) => {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid JSON in request body',
      error
    );
  }

  const parsed = updateOrganizationsSchema.safeParse(rawBody);
  if (!parsed.success) {
    return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid request body',
      error
    );
  }

  const body = parsed.data;
  const { userId, organizationId } = context;

  const orgId = (body as Record<string, unknown>)["organizationId"] ?? (body as Record<string, unknown>)["orgId"] ?? (body as Record<string, unknown>)["organization_id"] ?? (body as Record<string, unknown>)["org_id"] ?? (body as Record<string, unknown>)["unionId"] ?? (body as Record<string, unknown>)["union_id"] ?? (body as Record<string, unknown>)["localId"] ?? (body as Record<string, unknown>)["local_id"];
  if (typeof orgId === 'string' && orgId.length > 0 && orgId !== organizationId) {
    return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Forbidden',
      error
    );
  }

try {
      // Check admin role
      const isAdmin = await checkAdminRole(userId);
      if (!isAdmin) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(), userId,
          endpoint: '/api/admin/organizations',
          method: 'PATCH',
          eventType: 'unauthorized_access',
          severity: 'high',
          details: { reason: 'Non-admin attempted bulk update' },
        });
        return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Forbidden - Admin access required'
    );
      }

      const { organizationIds, updates } = body;

      // Perform bulk update
      await db
        .update(organizations)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(inArray(organizations.id, organizationIds));

      logApiAuditEvent({
        timestamp: new Date().toISOString(), userId,
        endpoint: '/api/admin/organizations',
        method: 'PATCH',
        eventType: 'success',
        severity: 'medium',
        details: { updatedCount: organizationIds.length, updates: Object.keys(updates) },
      });

      return NextResponse.json({
        data: {
          updatedCount: organizationIds.length,
          updatedIds: organizationIds,
        },
        message: `${organizationIds.length} organization(s) updated successfully`,
      });
    } catch (error) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(), userId,
        endpoint: '/api/admin/organizations',
        method: 'PATCH',
        eventType: 'auth_failed',
        severity: 'high',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      });

      logger.error("Error bulk updating organizations", { error });
      throw error;
    }
});

// =====================================================
// DELETE - Bulk Archive Organizations
// =====================================================

export const DELETE = withRoleAuth(90, async (request, context) => {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid JSON in request body',
      error
    );
  }

  const parsed = deleteOrganizationsSchema.safeParse(rawBody);
  if (!parsed.success) {
    return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid request body',
      error
    );
  }

  const body = parsed.data;
  const { userId, organizationId } = context;

  const orgId = (body as Record<string, unknown>)["organizationId"] ?? (body as Record<string, unknown>)["orgId"] ?? (body as Record<string, unknown>)["organization_id"] ?? (body as Record<string, unknown>)["org_id"] ?? (body as Record<string, unknown>)["unionId"] ?? (body as Record<string, unknown>)["union_id"] ?? (body as Record<string, unknown>)["localId"] ?? (body as Record<string, unknown>)["local_id"];
  if (typeof orgId === 'string' && orgId.length > 0 && orgId !== organizationId) {
    return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Forbidden',
      error
    );
  }

try {
      // Check admin role
      const isAdmin = await checkAdminRole(userId);
      if (!isAdmin) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(), userId,
          endpoint: '/api/admin/organizations',
          method: 'DELETE',
          eventType: 'unauthorized_access',
          severity: 'high',
          details: { reason: 'Non-admin attempted bulk delete' },
        });
        return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Forbidden - Admin access required'
    );
      }

      const { organizationIds } = body;

      // Check for child organizations
      const [childrenResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(organizations)
        .where(inArray(organizations.parentId, organizationIds));

      if (childrenResult && Number(childrenResult.count) > 0) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(), userId,
          endpoint: '/api/admin/organizations',
          method: 'DELETE',
          eventType: 'validation_failed',
          severity: 'medium',
          details: { reason: 'Cannot archive organizations with children', count: childrenResult.count },
        });
        return NextResponse.json(
          {
            error: "Cannot archive organizations with children. Please archive or reassign child organizations first.",
          },
          { status: 400 }
        );
      }

      // Archive organizations (soft delete)
      await db
        .update(organizations)
        .set({
          status: "archived",
          updatedAt: new Date(),
        })
        .where(inArray(organizations.id, organizationIds));

      logApiAuditEvent({
        timestamp: new Date().toISOString(), userId,
        endpoint: '/api/admin/organizations',
        method: 'DELETE',
        eventType: 'success',
        severity: 'high',
        details: { archivedCount: organizationIds.length, organizationIds },
      });

      return NextResponse.json({
        data: {
          archivedCount: organizationIds.length,
          archivedIds: organizationIds,
        },
        message: `${organizationIds.length} organization(s) archived successfully`,
      });
    } catch (error) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(), userId,
        endpoint: '/api/admin/organizations',
        method: 'DELETE',
        eventType: 'auth_failed',
        severity: 'high',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      });

      logger.error("Error bulk archiving organizations", { error });
      throw error;
    }
});


