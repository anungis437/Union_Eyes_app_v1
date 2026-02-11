import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * Phase 5B: Shared Clause Library API - Search
 * Route: /api/clause-library/search
 * Methods: POST
 */

import { NextRequest, NextResponse } from "next/server";
import { db, organizations } from "@/db";
import { sharedClauseLibrary } from "@/db/schema";
import { eq, and, or, ilike, inArray, gte, lte, sql, isNull } from "drizzle-orm";
import { logger } from '@/lib/logger';
import { z } from "zod";
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { withRLSContext } from '@/lib/db/with-rls-context';
import { validateSharingLevel } from '@/lib/auth/hierarchy-access-control';

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
// POST /api/clause-library/search - Advanced search with full-text

const clause-librarySearchSchema = z.object({
  query: z.unknown().optional(),
  clauseTypes: z.unknown().optional(),
  sectors: z.unknown().optional(),
  provinces: z.unknown().optional(),
  sharingLevels: z.unknown().optional(),
  tags: z.unknown().optional(),
  effectiveDateFrom: z.string().datetime().optional(),
  effectiveDateTo: z.string().datetime().optional(),
  organizationIds: z.string().uuid('Invalid organizationIds'),
  includeExpired = false: z.unknown().optional(),
  page = 1: z.unknown().optional(),
  limit = 20: z.unknown().optional(),
  sortBy = "createdAt": z.unknown().optional(),
  sortOrder = "desc": z.unknown().optional(),
});

export const POST = async (request: NextRequest) => {
  return withRoleAuth(20, async (request, context) => {
    const user = { id: context.userId, organizationId: context.organizationId };

  try {
      // Use authenticated organization context
      if (!context.organizationId) {
        return standardErrorResponse(ErrorCode.MISSING_REQUIRED_FIELD, "No organization context");
      }

      const userOrgId = context.organizationId;
      
      // Fetch organization with hierarchy data
      const userOrg = await db.query.organizations.findFirst({
        where: eq(organizations.id, userOrgId),
      });
      
      const userOrgHierarchyPath = userOrg?.hierarchyPath?.join(',') || '';

      const body = await request.json();
    // Validate request body
    const validation = clause-librarySearchSchema.safeParse(body);
    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request data',
        validation.error.errors
      );
    }
    
    const { query, clauseTypes, sectors, provinces, sharingLevels, tags, effectiveDateFrom, effectiveDateTo, organizationIds, includeExpired = false, page = 1, limit = 20, sortBy = "createdAt", sortOrder = "desc" } = validation.data;

      const {
        query,
        clauseTypes,
        sectors,
        provinces,
        sharingLevels,
        tags,
        effectiveDateFrom,
        effectiveDateTo,
        organizationIds,
        includeExpired = false,
        page = 1,
        limit = 20,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = body;

      const offset = (page - 1) * limit;

      // Build filters
      const filters: any[] = [];

      // Full-text search on title and text
      if (query) {
        filters.push(
          or(
            ilike(sharedClauseLibrary.clauseTitle, `%${query}%`),
            ilike(sharedClauseLibrary.clauseText, `%${query}%`),
            ilike(sharedClauseLibrary.clauseNumber, `%${query}%`)
          )
        );
      }

      // Filter by clause types
      if (clauseTypes && Array.isArray(clauseTypes) && clauseTypes.length > 0) {
        filters.push(inArray(sharedClauseLibrary.clauseType, clauseTypes));
      }

      // Filter by sectors
      if (sectors && Array.isArray(sectors) && sectors.length > 0) {
        filters.push(inArray(sharedClauseLibrary.sector, sectors));
      }

      // Filter by provinces
      if (provinces && Array.isArray(provinces) && provinces.length > 0) {
        filters.push(inArray(sharedClauseLibrary.province, provinces));
      }

      // Filter by sharing levels
      if (sharingLevels && Array.isArray(sharingLevels) && sharingLevels.length > 0) {
        filters.push(inArray(sharedClauseLibrary.sharingLevel, sharingLevels));
      }

      // Filter by organizations
      if (organizationIds && Array.isArray(organizationIds) && organizationIds.length > 0) {
        filters.push(inArray(sharedClauseLibrary.sourceOrganizationId, organizationIds));
      }

      // Filter by effective date range
      if (effectiveDateFrom) {
        filters.push(gte(sharedClauseLibrary.effectiveDate, effectiveDateFrom));
      }

      if (effectiveDateTo) {
        filters.push(lte(sharedClauseLibrary.effectiveDate, effectiveDateTo));
      }

      // Exclude expired clauses unless explicitly included
      if (!includeExpired) {
        const today = new Date().toISOString().split('T')[0];
        filters.push(
          or(
            isNull(sharedClauseLibrary.expiryDate),
            gte(sharedClauseLibrary.expiryDate, today)
          )
        );
      }

      // Query clauses with RLS enforcement
      const clauses = await withRLSContext({ organizationId: userOrgId }, async (db) => {
        return await db.query.sharedClauseLibrary.findMany({
          where: filters.length > 0 ? and(...filters) : undefined,
          with: {
            tags: true,
          },
          limit: limit + offset, // Fetch more to account for access filtering
          orderBy: (clause, { desc, asc }) => {
            const column = clause[sortBy as keyof typeof clause] || clause.createdAt;
            return sortOrder === "desc" ? [desc(column as any)] : [asc(column as any)];
          },
        });
      });

      // Filter by access permissions
      const accessibleClauses = [];
      for (const clause of clauses) {
        const isOwner = clause.sourceOrganizationId === userOrgId;
        let hasAccess = isOwner;

        if (!isOwner) {
          const sharingLevel = clause.sharingLevel;

          switch (sharingLevel) {
            case "private":
              hasAccess = clause.sharedWithOrgIds?.includes(userOrgId) || false;
              break;
            
            case "federation":
              // Validate federation-level access using hierarchy
              try {
                await validateSharingLevel(context.userId, clause.sourceOrganizationId, 'federation');
                hasAccess = true;
              } catch (error) {
                hasAccess = false;
              }
              break;
            
            case "congress":
              // Validate congress-level (CLC) access using hierarchy
              try {
                await validateSharingLevel(context.userId, clause.sourceOrganizationId, 'congress');
                hasAccess = true;
              } catch (error) {
                hasAccess = false;
              }
              break;
            
            case "public":
              hasAccess = true;
              break;
          }
        }

        if (hasAccess) {
          accessibleClauses.push(clause);
        }

        // Stop if we have enough results
        if (accessibleClauses.length >= offset + limit) {
          break;
        }
      }

      // Apply pagination after access filtering
      const paginatedClauses = accessibleClauses.slice(offset, offset + limit);

      // Filter by tags if requested (post-query filtering for simplicity)
      let finalClauses = paginatedClauses;
      if (tags && Array.isArray(tags) && tags.length > 0) {
        finalClauses = paginatedClauses.filter(clause => {
          const clauseTags = clause.tags.map(t => t.tagName);
          return tags.some(tag => clauseTags.includes(tag));
        });
      }

      // Get total count (approximate, since we filter by access)
      const totalResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(sharedClauseLibrary)
        .where(filters.length > 0 ? and(...filters) : undefined);

      const total = totalResult[0].count;

      return NextResponse.json({
        clauses: finalClauses,
        pagination: {
          page,
          limit,
          total: accessibleClauses.length,
          totalPages: Math.ceil(accessibleClauses.length / limit),
          estimatedTotal: total,
        },
      });

    } catch (error) {
      logger.error('Error searching clauses', error as Error, {      correlationId: request.headers.get('x-correlation-id')
      });
      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to search clauses',
      error
    );
    }
    })(request);
};


