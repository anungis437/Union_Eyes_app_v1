import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * Phase 5B: Shared Clause Library API
 * Route: /api/clause-library
 * Methods: GET (list), POST (create)
 */

import { NextRequest, NextResponse } from "next/server";
import { db, organizations } from "@/db";
import { 
  sharedClauseLibrary, 
  clauseLibraryTags,
  NewSharedClause,
  SharingLevel
} from "@/db/schema";
import { organizationSharingSettings } from "@/db/schema/sharing-permissions-schema";
import { eq, and, or, ilike, inArray, sql, count } from "drizzle-orm";
import { getOrCreateUserUuid } from "@/lib/utils/user-uuid-helpers";
import { logger } from '@/lib/logger';
import { z } from "zod";
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { withRLSContext } from '@/lib/db/with-rls-context';
import { validateHierarchyAccess, validateSharingLevel } from '@/lib/auth/hierarchy-access-control';
import type { InferSelectModel } from 'drizzle-orm';

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

/**
 * Zod schema for creating a new shared clause
 * Validates all input fields to prevent injection attacks
 */
const createClauseSchema = z.object({
  sourceCbaId: z.string().uuid().optional().nullable(),
  originalClauseId: z.string().uuid().optional().nullable(),
  clauseNumber: z.string().max(50).optional().nullable(),
  clauseTitle: z.string().min(1, "Clause title is required").max(500),
  clauseText: z.string().min(1, "Clause text is required"),
  clauseType: z.string().min(1, "Clause type is required").max(100),
  isAnonymized: z.boolean().optional(),
  originalEmployerName: z.string().max(500).optional().nullable(),
  sharingLevel: z.enum(["private", "federation", "congress", "public"]).optional(),
  sharedWithOrgIds: z.array(z.string().uuid()).optional().nullable(),
  effectiveDate: z.string().datetime().or(z.string().date()).optional().nullable(),
  expiryDate: z.string().datetime().or(z.string().date()).optional().nullable(),
  sector: z.string().max(100).optional().nullable(),
  province: z.string().length(2).optional().nullable(),
  tags: z.array(z.string().max(100)).optional(),
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

// Helper to anonymize employer names
function anonymizeEmployerName(originalName: string): string {
  // Simple anonymization: "ABC Corporation" -> "Anonymous Employer (Manufacturing)"
  const suffixes = ["Inc.", "Corporation", "Ltd.", "LLC", "Co.", "Company"];
  let baseName = originalName;
  suffixes.forEach(suffix => {
    baseName = baseName.replace(new RegExp(`\\s*${suffix}\\s*$`, 'i'), '');
  });
  
  return `Anonymous Employer`;
}

// Helper to check if user can access clause based on sharing level
async function canAccessClause(
  userId: string,
  userOrgId: string,
  userOrgHierarchyPath: string,
  clause: any
): Promise<boolean> {
  // Owner always has access
  if (clause.sourceOrganizationId === userOrgId) {
    return true;
  }

  const sharingLevel = clause.sharingLevel as SharingLevel;

  switch (sharingLevel) {
    case "private":
      // Check explicit grants
      return clause.sharedWithOrgIds?.includes(userOrgId) || false;
    
    case "federation":
      // Validate federation-level access using hierarchy
      try {
        await validateSharingLevel(userId, clause.sourceOrganizationId, 'federation');
        return true;
      } catch (error) {
        return false;
      }
    
    case "congress":
      // Validate congress-level (CLC) access using hierarchy
      try {
        await validateSharingLevel(userId, clause.sourceOrganizationId, 'congress');
        return true;
      } catch (error) {
        return false;
      }
    
    case "public":
      // Everyone can access
      return true;
    
    default:
      return false;
  }
}

// GET /api/clause-library - List clauses with filters
export const GET = async (request: NextRequest) => {
  return withRoleAuth(10, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      // Use authenticated organization context (validated by withRoleAuth)
      if (!organizationId) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: '/api/clause-library',
          method: 'GET',
          eventType: 'validation_failed',
          severity: 'medium',
          dataType: 'CLAUSE_LIBRARY',
          details: { reason: 'No organization context' },
        });
        return NextResponse.json({ error: "No organization context" }, { status: 400 });
      }

      const userOrgId = organizationId;
      
      // Fetch organization with hierarchy data
      const userOrg = await db.query.organizations.findFirst({
        where: eq(organizations.id, userOrgId),
      });
      
      const userOrgHierarchyPath = userOrg?.hierarchyPath?.join(',') || '';

      // Parse query params
      const { searchParams } = new URL(request.url);
      const page = parseInt(searchParams.get("page") || "1");
      const limit = parseInt(searchParams.get("limit") || "20");
      const offset = (page - 1) * limit;

      const clauseType = searchParams.get("clauseType");
      const sector = searchParams.get("sector");
      const province = searchParams.get("province");
      const sharingLevel = searchParams.get("sharingLevel");
      const searchQuery = searchParams.get("q");

      // Build filters
      const filters: any[] = [];

      if (clauseType) {
        filters.push(eq(sharedClauseLibrary.clauseType, clauseType));
      }

      if (sector) {
        filters.push(eq(sharedClauseLibrary.sector, sector));
      }

      if (province) {
        filters.push(eq(sharedClauseLibrary.province, province));
      }

      if (sharingLevel) {
        filters.push(eq(sharedClauseLibrary.sharingLevel, sharingLevel));
      }

      if (searchQuery) {
        filters.push(
          or(
            ilike(sharedClauseLibrary.clauseTitle, `%${searchQuery}%`),
            ilike(sharedClauseLibrary.clauseText, `%${searchQuery}%`)
          )
        );
      }

      // Query clauses with RLS enforcement
      const clauses = await withRLSContext({ organizationId: userOrgId }, async (db) => {
        let clausesQuery = db
          .select()
          .from(sharedClauseLibrary)
          .limit(limit)
          .offset(offset)
          .orderBy(sql`${sharedClauseLibrary.createdAt} DESC`)
          .$dynamic();
        
        if (filters.length > 0) {
          clausesQuery = clausesQuery.where(and(...filters));
        }
        
        return await clausesQuery;
      });

      // Filter by access permissions
      const accessibleClauses = [];
      for (const clause of clauses) {
        const canAccess = await canAccessClause(
          userId,
          userOrgId,
          userOrgHierarchyPath,
          clause
        );

        if (canAccess) {
          accessibleClauses.push(clause);
        }
      }

      // Get total count for pagination with RLS enforcement
      const totalResult = await withRLSContext({ organizationId: userOrgId }, async (db) => {
        return await db
          .select({ count: sql<number>`count(*)` })
          .from(sharedClauseLibrary)
          .where(filters.length > 0 ? and(...filters) : undefined);
      });

      const total = totalResult[0].count;

      // Log successful data access
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: '/api/clause-library',
        method: 'GET',
        eventType: 'success',
        severity: 'low',
        dataType: 'CLAUSE_LIBRARY',
        details: { 
          organizationId: userOrgId,
          clausesReturned: accessibleClauses.length,
          totalAvailable: total,
          filters: { clauseType, sector, province, sharingLevel, searchQuery } 
        },
      });

      return NextResponse.json({
        clauses: accessibleClauses,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });

    } catch (error) {
      logger.error('Error fetching clauses', error as Error, {      correlationId: request.headers.get('x-correlation-id')
      });
      return NextResponse.json(
        { error: "Failed to fetch clauses" },
        { status: 500 }
      );
    }
    })(request);
};

// POST /api/clause-library - Create new shared clause
export const POST = async (request: NextRequest) => {
  return withRoleAuth(20, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      // Use authenticated organization context (validated by withRoleAuth)
      if (!organizationId) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: '/api/clause-library',
          method: 'POST',
          eventType: 'validation_failed',
          severity: 'medium',
          dataType: 'CLAUSE_LIBRARY',
          details: { reason: 'No organization context' },
        });
        return NextResponse.json({ error: "No organization context" }, { status: 400 });
      }

      const body = await request.json();

      // Validate input with Zod schema
      const validationResult = createClauseSchema.safeParse(body);
      
      if (!validationResult.success) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: '/api/clause-library',
          method: 'POST',
          eventType: 'validation_failed',
          severity: 'low',
          dataType: 'CLAUSE_LIBRARY',
          details: { 
            organizationId,
            reason: 'Invalid input schema',
            errors: validationResult.error.format() 
          },
        });
        return NextResponse.json(
          { 
            error: "Invalid input", 
            details: validationResult.error.format() 
          },
          { status: 400 }
        );
      }

      const {
        sourceCbaId,
        originalClauseId,
        clauseNumber,
        clauseTitle,
        clauseText,
        clauseType,
        isAnonymized,
        originalEmployerName,
        sharingLevel,
        sharedWithOrgIds,
        effectiveDate,
        expiryDate,
        sector,
        province,
        tags,
      } = validationResult.data;

      // Fetch organization-level sharing settings to validate request
      let orgSharingSettings;
      try {
        const settings = await db.select().from(organizationSharingSettings)
          .where(eq(organizationSharingSettings.organizationId, organizationId))
          .limit(1);
        orgSharingSettings = settings[0];
      } catch (error) {
        logger.error('Error fetching organization sharing settings:', error);
        // Continue with defaults if settings don't exist
        orgSharingSettings = null;
      }

      // Use provided sharing level or org default or fall back to private
      const requestedSharingLevel = sharingLevel ?? orgSharingSettings?.defaultSharingLevel ?? "private";

      // Validate sharing level is allowed by organization settings
      if (orgSharingSettings?.allowedSharingLevels && orgSharingSettings.allowedSharingLevels.length > 0) {
        if (!orgSharingSettings.allowedSharingLevels.includes(requestedSharingLevel)) {
          logApiAuditEvent({
            timestamp: new Date().toISOString(),
            userId,
            endpoint: '/api/clause-library',
            method: 'POST',
            eventType: 'sharing_level_not_allowed',
            severity: 'medium',
            dataType: 'CLAUSE_LIBRARY',
            details: { 
              organizationId,
              requestedLevel: requestedSharingLevel,
              allowedLevels: orgSharingSettings.allowedSharingLevels 
            },
          });
          return NextResponse.json(
            { 
              error: `Sharing level '${requestedSharingLevel}' is not allowed by organization settings`,
              allowedLevels: orgSharingSettings.allowedSharingLevels
            },
            { status: 403 }
          );
        }
      }

      // Check if max shared clauses limit has been reached
      if (orgSharingSettings?.maxSharedClauses) {
        const [clauseCount] = await db.select({ count: count() })
          .from(sharedClauseLibrary)
          .where(eq(sharedClauseLibrary.sourceOrganizationId, organizationId));
        
        if (clauseCount.count >= orgSharingSettings.maxSharedClauses) {
          logApiAuditEvent({
            timestamp: new Date().toISOString(),
            userId,
            endpoint: '/api/clause-library',
            method: 'POST',
            eventType: 'max_clauses_exceeded',
            severity: 'medium',
            dataType: 'CLAUSE_LIBRARY',
            details: { 
              organizationId,
              currentCount: clauseCount.count,
              maxAllowed: orgSharingSettings.maxSharedClauses 
            },
          });
          return NextResponse.json(
            { 
              error: `Maximum shared clauses limit (${orgSharingSettings.maxSharedClauses}) reached`,
              currentCount: clauseCount.count
            },
            { status: 403 }
          );
        }
      }
      
      // Apply anonymization - use org setting if not explicitly provided
      const shouldAnonymize = isAnonymized ?? orgSharingSettings?.requireAnonymization ?? true;
      const anonymizedEmployerName = shouldAnonymize && originalEmployerName
        ? anonymizeEmployerName(originalEmployerName)
        : null;

      const finalSharingLevel = requestedSharingLevel;

      // Get or create UUID for this Clerk user
      const userUuid = await getOrCreateUserUuid(userId);

      // Create clause
      const newClause: NewSharedClause = {
        sourceOrganizationId: organizationId,
        sourceCbaId: sourceCbaId || null,
        originalClauseId: originalClauseId || null,
        clauseNumber: clauseNumber || null,
        clauseTitle,
        clauseText,
        clauseType,
        isAnonymized: shouldAnonymize,
        originalEmployerName: originalEmployerName || null,
        anonymizedEmployerName,
        sharingLevel: finalSharingLevel,
        sharedWithOrgIds: sharedWithOrgIds || null,
        effectiveDate: effectiveDate || null,
        expiryDate: expiryDate || null,
        sector: sector || null,
        province: province || null,
        createdBy: userUuid,
      };

      const [createdClause] = await withRLSContext({ organizationId }, async (db) => {
        return await db
          .insert(sharedClauseLibrary)
          .values(newClause)
          .returning();
      });

      // Add tags if provided
      if (tags && Array.isArray(tags) && tags.length > 0) {
        const tagValues = tags.map((tagName: string) => ({
          clauseId: createdClause.id,
          tagName: tagName.trim(),
          createdBy: userUuid,
        }));

        await withRLSContext({ organizationId }, async (db) => {
          return await db.insert(clauseLibraryTags).values(tagValues);
        });
      }

      // Fetch full clause with relations
      const fullClause = await withRLSContext({ organizationId }, async (db) => {
        return await db.query.sharedClauseLibrary.findFirst({
          where: (clause, { eq }) => eq(clause.id, createdClause.id),
          with: {
            sourceOrganization: {
              columns: {
                id: true,
                name: true,
              },
            },
            tags: true,
          },
        });
      });

      // Log successful clause creation
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: '/api/clause-library',
        method: 'POST',
        eventType: 'success',
        severity: 'low',
        dataType: 'CLAUSE_LIBRARY',
        details: { 
          organizationId,
          clauseId: createdClause.id,
          clauseTitle: validationResult.data.clauseTitle,
          clauseType: validationResult.data.clauseType,
          sharingLevel: finalSharingLevel,
          isAnonymized: shouldAnonymize,
          tagsCount: tags?.length || 0,
        },
      });

      return NextResponse.json(fullClause, { status: 201 });

    } catch (error) {
      logger.error('Error creating clause', error as Error, {      correlationId: request.headers.get('x-correlation-id')
      });
      return NextResponse.json(
        { error: "Failed to create clause" },
        { status: 500 }
      );
    }
    })(request);
};
// Trigger rebuild after cache clear

