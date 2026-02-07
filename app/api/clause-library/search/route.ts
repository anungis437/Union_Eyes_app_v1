import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * Phase 5B: Shared Clause Library API - Search
 * Route: /api/clause-library/search
 * Methods: POST
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db, organizations } from "@/db";
import { sharedClauseLibrary } from "@/db/schema";
import { eq, and, or, ilike, inArray, gte, lte, sql, isNull } from "drizzle-orm";
import { logger } from '@/lib/logger';
import { z } from "zod";
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";

// POST /api/clause-library/search - Advanced search with full-text
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
      const orgResult = await db
        .select({ id: organizations.id })
        .from(organizations)
        .where(eq(organizations.slug, orgSlug))
        .limit(1);

      if (orgResult.length === 0) {
        return NextResponse.json({ error: "Organization not found" }, { status: 400 });
      }

      const userOrgId = orgResult[0].id;
      // TODO: Add hierarchyPath once tenant hierarchy is implemented
      const userOrgHierarchyPath = '';

      const body = await request.json();

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

      // Query clauses
      const clauses = await db.query.sharedClauseLibrary.findMany({
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
              // TODO: Check federation hierarchy when implemented
              hasAccess = false;
              break;
            
            case "congress":
              // TODO: Check CLC membership when implemented
              hasAccess = false;
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
      return NextResponse.json(
        { error: "Failed to search clauses" },
        { status: 500 }
      );
    }
  })
  })(request);
};

