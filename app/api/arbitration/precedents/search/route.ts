import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * Phase 5B: Arbitration Precedents Advanced Search API
 * Route: /api/arbitration/precedents/search
 * Method: POST (complex search with multiple filters)
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { db, organizations } from "@/db";
import { arbitrationPrecedents } from "@/db/schema";
import { eq, and, or, ilike, inArray, gte, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';
import { withRLSContext } from '@/lib/db/with-rls-context';

// Helper to check access
async function canAccessPrecedent(
  userId: string,
  userOrgId: string,
  userOrgHierarchyPath: string,
  precedent: any
): Promise<boolean> {
  if (precedent.sourceOrganizationId === userOrgId) {
    return true;
  }

  const sharingLevel = precedent.sharingLevel;

  switch (sharingLevel) {
    case "private":
      return precedent.sharedWithOrgIds?.includes(userOrgId) || false;
    case "federation":
      // TODO: Check federation hierarchy
      return false;
    case "congress":
      // TODO: Check CLC membership
      return false;
    case "public":
      return true;
    default:
      return false;
  }
}

// POST /api/arbitration/precedents/search - Advanced search
export const POST = async (request: NextRequest) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      // Validate organization context
      if (!organizationId) {
        return NextResponse.json({ error: "No active organization" }, { status: 400 });
      }

      const userOrgId = organizationId;
      const userOrgHierarchyPath = ''; // TODO: Add once hierarchy is implemented

      const body = await request.json();

      // Parse search criteria
      const {
        query,
        grievanceTypes,
        outcomes,
        jurisdictions,
        precedentLevels,
        sectors,
        industries,
        provinces,
        arbitratorNames,
        fromDate,
        toDate,
        tags,
        sharingLevels,
        minCitations,
        maxCitations,
        page = 1,
        limit = 20,
        sortBy = 'decisionDate',
        sortOrder = 'desc',
      } = body;

      const offset = (page - 1) * limit;

      // Build filters array
      const filters: any[] = [];

      // Full-text search across multiple fields
      if (query && query.trim()) {
        filters.push(
          or(
            ilike(arbitrationPrecedents.caseTitle, `%${query}%`),
            ilike(arbitrationPrecedents.caseNumber, `%${query}%`),
            ilike(arbitrationPrecedents.issueSummary, `%${query}%`),
            ilike(arbitrationPrecedents.decisionSummary, `%${query}%`),
            ilike(arbitrationPrecedents.reasoning, `%${query}%`)
          )
        );
      }

      // Array filters
      if (grievanceTypes && Array.isArray(grievanceTypes) && grievanceTypes.length > 0) {
        filters.push(inArray(arbitrationPrecedents.grievanceType, grievanceTypes));
      }

      if (outcomes && Array.isArray(outcomes) && outcomes.length > 0) {
        filters.push(inArray(arbitrationPrecedents.outcome, outcomes));
      }

      if (jurisdictions && Array.isArray(jurisdictions) && jurisdictions.length > 0) {
        filters.push(inArray(arbitrationPrecedents.jurisdiction, jurisdictions));
      }

      if (precedentLevels && Array.isArray(precedentLevels) && precedentLevels.length > 0) {
        filters.push(inArray(arbitrationPrecedents.precedentLevel, precedentLevels));
      }

      if (sectors && Array.isArray(sectors) && sectors.length > 0) {
        filters.push(inArray(arbitrationPrecedents.sector, sectors));
      }

      if (industries && Array.isArray(industries) && industries.length > 0) {
        filters.push(inArray(arbitrationPrecedents.industry, industries));
      }

      if (sharingLevels && Array.isArray(sharingLevels) && sharingLevels.length > 0) {
        filters.push(inArray(arbitrationPrecedents.sharingLevel, sharingLevels));
      }

      // Arbitrator name search (partial match)
      if (arbitratorNames && Array.isArray(arbitratorNames) && arbitratorNames.length > 0) {
        const arbitratorFilters = arbitratorNames.map(name => 
          ilike(arbitrationPrecedents.arbitratorName, `%${name}%`)
        );
        filters.push(or(...arbitratorFilters));
      }

      // Date range filters
      if (fromDate) {
        filters.push(gte(arbitrationPrecedents.decisionDate, fromDate));
      }

      if (toDate) {
        filters.push(lte(arbitrationPrecedents.decisionDate, toDate));
      }

      // Citation count filters
      if (minCitations !== undefined && minCitations !== null) {
        filters.push(gte(arbitrationPrecedents.citationCount, minCitations));
      }

      if (maxCitations !== undefined && maxCitations !== null) {
        filters.push(lte(arbitrationPrecedents.citationCount, maxCitations));
      }

      // Build order by clause
      let orderByClause;
      const isDesc = sortOrder === 'desc';
      
      switch (sortBy) {
        case 'decisionDate':
          orderByClause = (p: any, { desc, asc }: any) => [isDesc ? desc(p.decisionDate) : asc(p.decisionDate)];
          break;
        case 'citationCount':
          orderByClause = (p: any, { desc, asc }: any) => [isDesc ? desc(p.citationCount) : asc(p.citationCount)];
          break;
        case 'viewCount':
          orderByClause = (p: any, { desc, asc }: any) => [isDesc ? desc(p.viewCount) : asc(p.viewCount)];
          break;
        case 'precedentLevel':
          orderByClause = (p: any, { desc, asc }: any) => [isDesc ? desc(p.precedentLevel) : asc(p.precedentLevel)];
          break;
        case 'createdAt':
          orderByClause = (p: any, { desc, asc }: any) => [isDesc ? desc(p.createdAt) : asc(p.createdAt)];
          break;
        default:
          orderByClause = (p: any, { desc }: any) => [desc(p.decisionDate), desc(p.createdAt)];
      }

      // Query precedents with filters
      const precedents = await withRLSContext({ organizationId: userOrgId }, async (db) => {
        return await db.query.arbitrationPrecedents.findMany({
          where: filters.length > 0 ? and(...filters) : undefined,
          limit,
          offset,
          orderBy: orderByClause,
          with: {
            sourceOrganization: {
              columns: {
                id: true,
                name: true,
                slug: true,
              }
            },
            tags: true,
          }
        });
      });

      // Filter by tags if specified (post-query filtering since tags are in related table)
      let filteredPrecedents = precedents;
      if (tags && Array.isArray(tags) && tags.length > 0) {
        const lowerTags = tags.map(t => t.toLowerCase());
        filteredPrecedents = precedents.filter(p => {
          const precedentTags = p.tags?.map(t => t.tagName.toLowerCase()) || [];
          return lowerTags.some(tag => precedentTags.includes(tag));
        });
      }

      // Filter by access permissions
      const accessiblePrecedents = await Promise.all(
        filteredPrecedents.map(async (precedent) => {
          const hasAccess = await canAccessPrecedent( userId,
            userOrgId,
            userOrgHierarchyPath,
            precedent
          );
          return hasAccess ? precedent : null;
        })
      );

      const finalPrecedents = accessiblePrecedents.filter((p): p is NonNullable<typeof p> => p !== null);

      // Get total count for pagination (approximate since we're doing post-filtering)
      const [{ count }] = await withRLSContext({ organizationId: userOrgId }, async (db) => {
        return await db
          .select({ count: sql<number>`count(*)::int` })
          .from(arbitrationPrecedents)
          .where(filters.length > 0 ? and(...filters) : undefined);
      });

      return NextResponse.json({
        precedents: finalPrecedents,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit),
        },
        filters: {
          query,
          grievanceTypes,
          outcomes,
          jurisdictions,
          precedentLevels,
          sectors,
          fromDate,
          toDate,
          tags,
          sortBy,
          sortOrder,
        }
      });
    } catch (error) {
      logger.error('Failed to search precedents', error as Error, {
        correlationId: request.headers.get('x-correlation-id'),
      });
      return NextResponse.json(
        { error: "Failed to search precedents" },
        { status: 500 }
      );
    }
    })(request);
};

