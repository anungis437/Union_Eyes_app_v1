import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * Phase 5B: Arbitration Precedents Advanced Search API
 * Route: /api/arbitration/precedents/search
 * Method: POST (complex search with multiple filters)
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { organizations } from "@/db";
import { arbitrationPrecedents } from "@/db/schema";
import { and, or, ilike, inArray } from "drizzle-orm";
import { z } from "zod";
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';
import { withRLSContext } from '@/lib/db/with-rls-context';

import { standardSuccessResponse } from '@/lib/api/standardized-responses';
// Helper to check access
async function async function canAccessPrecedent(
  userId: string,
  userOrgId: string,
  userOrgHierarchyPath: string[],
  precedent: Record<string, unknown>
): Promise<boolean> {
  if (precedent.sourceOrganizationId === userOrgId) {
    return true;
  }

  const sharingLevel = precedent.sharingLevel;

  switch (sharingLevel) {
    case "private":
      return precedent.sharedWithOrgIds?.includes(userOrgId) || false;
    case "federation":
      // Check if organizations share a common parent in hierarchy
      if (!userOrgHierarchyPath || userOrgHierarchyPath.length === 0) {
        return false;
      }
      try {
        const sourceOrg = await db.selectDistinct().from(organizations).where(eq(organizations.id, precedent.sourceOrganizationId)).limit(1);
        const sourceOrgData = sourceOrg[0];
        if (!sourceOrgData?.hierarchyPath || sourceOrgData.hierarchyPath.length === 0) {
          return false;
        }
        // Check if organizations share any common parent in their hierarchy paths
        const hasCommonParent = userOrgHierarchyPath.some(parentId => 
          sourceOrgData.hierarchyPath.includes(parentId)
        );
        return hasCommonParent;
      } catch (error) {
        logger.error('Error checking federation hierarchy:', error);
        return false;
      }
    case "congress":
      // Check CLC membership: both user's org and source org must be CLC-affiliated
      try {
        const [userOrg, sourceOrg] = await Promise.all([
          db.selectDistinct().from(organizations).where(eq(organizations.id, userOrgId)).limit(1),
          db.selectDistinct().from(organizations).where(eq(organizations.id, precedent.sourceOrganizationId)).limit(1)
        ]);
        
        const userOrgData = userOrg[0];
        const sourceOrgData = sourceOrg[0];
        
        // Both orgs must be CLC-affiliated with active status
        return (
          userOrgData?.clcAffiliated === true &&
          userOrgData?.status === 'active' &&
          sourceOrgData?.clcAffiliated === true &&
          sourceOrgData?.status === 'active'
        );
      } catch (error) {
        logger.error('Error checking CLC membership:', error);
        return false;
      }
    case "public":
      return true;
    default:
      return false;
  }
}

// POST /api/arbitration/precedents/search - Advanced search

const arbitrationPrecedentsSearchSchema = z.object({
  query: z.unknown().optional(),
  grievanceTypes: z.unknown().optional(),
  outcomes: z.unknown().optional(),
  jurisdictions: z.boolean().optional(),
  precedentLevels: z.unknown().optional(),
  sectors: z.unknown().optional(),
  industries: z.unknown().optional(),
  provinces: z.unknown().optional(),
  arbitratorNames: z.string().min(1, 'arbitratorNames is required'),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
  tags: z.unknown().optional(),
  sharingLevels: z.unknown().optional(),
  minCitations: z.unknown().optional(),
  maxCitations: z.unknown().optional(),
  page: z.unknown().optional().default(1),
  limit: z.unknown().optional().default(20),
  sortBy: z.boolean().optional().default('decisionDate'),
  sortOrder: z.unknown().optional().default('desc'),
});

export const POST = async (request: NextRequest) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      // Validate organization context
      if (!organizationId) {
        return standardErrorResponse(ErrorCode.MISSING_REQUIRED_FIELD, "No active organization");
      }

      const userOrgId = organizationId;
      
      // Fetch user's organization hierarchy path for federation sharing checks
      let userOrgHierarchyPath: string[] = [];
      try {
        const userOrg = await db.selectDistinct().from(organizations).where(eq(organizations.id, userOrgId)).limit(1);
        userOrgHierarchyPath = userOrg[0]?.hierarchyPath || [];
      } catch (error) {
        logger.error('Error fetching user organization hierarchy:', error);
      }

      const body = await request.json();
    // Validate request body
    const validation = arbitrationPrecedentsSearchSchema.safeParse(body);
    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request data',
        validation.error.errors
      );
    }
    
      // DUPLICATE REMOVED:     const { query, grievanceTypes, outcomes, jurisdictions, precedentLevels, sectors, industries, provinces, arbitratorNames, fromDate, toDate, tags, sharingLevels, minCitations, maxCitations, page = 1, limit = 20, sortBy = 'decisionDate', sortOrder = 'desc' } = validation.data;

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
      const filters: Array<Record<string, unknown>> = [];

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

      // Get total count for pagination (approximate since we&apos;re doing post-filtering)
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
      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to search precedents',
      error
    );
    }
    })(request);
};

