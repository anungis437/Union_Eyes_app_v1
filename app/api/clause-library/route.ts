import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * Phase 5B: Shared Clause Library API
 * Route: /api/clause-library
 * Methods: GET (list), POST (create)
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db, organizations } from "@/db";
import { 
  sharedClauseLibrary, 
  clauseLibraryTags,
  NewSharedClause,
  SharingLevel
} from "@/db/schema";
import { eq, and, or, ilike, inArray, sql } from "drizzle-orm";
import { getOrCreateUserUuid } from "@/lib/utils/user-uuid-helpers";
import { logger } from '@/lib/logger';
import { z } from "zod";
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";

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
  // TODO: Implement hierarchy-based access control when tenant hierarchy is ready

  switch (sharingLevel) {
    case "private":
      // Check explicit grants
      return clause.sharedWithOrgIds?.includes(userOrgId) || false;
    
    case "federation":
      // TODO: Check federation hierarchy when implemented
      // Temporarily allow access until hierarchy is built
      return true;
    
    case "congress":
      // TODO: Check CLC membership when implemented
      // Temporarily allow access until hierarchy is built
      return true;
    
    case "public":
      // Everyone can access
      return true;
    
    default:
      return false;
  }
}

// GET /api/clause-library - List clauses with filters
export const GET = async (request: NextRequest) => {
  return withEnhancedRoleAuth(10, async (request, context) => {
    const user = { id: context.userId, organizationId: context.organizationId };

  try {
      // Get user's organization from cookie (set by organization switcher)
      const cookieStore = await cookies();
      const orgSlug = cookieStore.get('active-organization')?.value;
      
      if (!orgSlug) {
        return NextResponse.json({ error: "No active organization" }, { status: 400 });
      }

      // Convert slug to UUID (use select instead of query to avoid relational joins)
      const orgResult = await db
        .select({ id: organizations.id, slug: organizations.slug, name: organizations.name })
        .from(organizations)
        .where(eq(organizations.slug, orgSlug))
        .limit(1);

      if (orgResult.length === 0) {
        return NextResponse.json({ error: "Organization not found" }, { status: 400 });
      }

      const userOrgId = orgResult[0].id;
      // TODO: Add hierarchyPath once tenant hierarchy is implemented
      const userOrgHierarchyPath = '';

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

      // Query clauses (use select instead of query to avoid relational joins with jurisdiction column)
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
      
      const clauses = await clausesQuery;

      // Filter by access permissions
      const accessibleClauses = [];
      for (const clause of clauses) {
        const canAccess = await canAccessClause(
          user.id!,
          userOrgId,
          userOrgHierarchyPath,
          clause
        );

        if (canAccess) {
          accessibleClauses.push(clause);
        }
      }

      // Get total count for pagination
      const totalResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(sharedClauseLibrary)
        .where(filters.length > 0 ? and(...filters) : undefined);

      const total = totalResult[0].count;

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
  })
  })(request);
};

// POST /api/clause-library - Create new shared clause
export const POST = async (request: NextRequest) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
    const user = { id: context.userId, organizationId: context.organizationId };

  try {
      // Get user's organization from cookie (set by organization switcher)
      const cookieStore = await cookies();
      const orgSlug = cookieStore.get('active-organization')?.value;
      
      if (!orgSlug) {
        return NextResponse.json({ error: "No active organization" }, { status: 400 });
      }

      // Convert slug to UUID
      const org = await db.query.organizations.findFirst({
        where: (o, { eq }) => eq(o.slug, orgSlug),
      });

      if (!org) {
        return NextResponse.json({ error: "Organization not found" }, { status: 400 });
      }

      const body = await request.json();

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
      } = body;

      // Validate required fields
      if (!clauseTitle || !clauseText || !clauseType) {
        return NextResponse.json(
          { error: "Missing required fields: clauseTitle, clauseText, clauseType" },
          { status: 400 }
        );
      }

      // For now, allow clause sharing (sharingSettings validation would go here)
      // TODO: Add tenant-level sharing settings once tenant schema is fully implemented
      
      // Apply auto-anonymization - default to true for privacy
      const shouldAnonymize = isAnonymized ?? true;
      const anonymizedEmployerName = shouldAnonymize && originalEmployerName
        ? anonymizeEmployerName(originalEmployerName)
        : null;

      // Use provided sharing level or default to private
      const finalSharingLevel = sharingLevel ?? "private";

      // Get or create UUID for this Clerk user
      const userUuid = await getOrCreateUserUuid(user.id);

      // Create clause
      const newClause: NewSharedClause = {
        sourceOrganizationId: org.id,
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

      const [createdClause] = await db
        .insert(sharedClauseLibrary)
        .values(newClause)
        .returning();

      // Add tags if provided
      if (tags && Array.isArray(tags) && tags.length > 0) {
        const tagValues = tags.map((tagName: string) => ({
          clauseId: createdClause.id,
          tagName: tagName.trim(),
          createdBy: userUuid,
        }));

        await db.insert(clauseLibraryTags).values(tagValues);
      }

      // Fetch full clause with relations
      const fullClause = await db.query.sharedClauseLibrary.findFirst({
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

      return NextResponse.json(fullClause, { status: 201 });

    } catch (error) {
      logger.error('Error creating clause', error as Error, {      correlationId: request.headers.get('x-correlation-id')
      });
      return NextResponse.json(
        { error: "Failed to create clause" },
        { status: 500 }
      );
    }
  })
  })(request);
};
// Trigger rebuild after cache clear
