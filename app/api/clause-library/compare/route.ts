import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * Phase 5B: Shared Clause Library API - Compare Clauses
 * Route: /api/clause-library/compare
 * Methods: POST
 */

import { NextRequest, NextResponse } from "next/server";
import { organizations } from "@/db";
import { 
  sharedClauseLibrary,
  clauseComparisonsHistory,
  NewClauseComparison
} from "@/db/schema";
import { inArray } from "drizzle-orm";
import { logger } from '@/lib/logger';
import { z } from "zod";
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';
import { withRLSContext } from '@/lib/db/with-rls-context';
import { validateSharingLevel } from '@/lib/auth/hierarchy-access-control';

import { standardSuccessResponse } from '@/lib/api/standardized-responses';
// POST /api/clause-library/compare - Compare multiple clauses

const clauseLibraryCompareSchema = z.object({
  clauseIds: z.string().uuid('Invalid clauseIds'),
  comparisonNotes: z.boolean().optional(),
});

export const POST = async (request: NextRequest) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      // Use authenticated organization context
      if (!organizationId) {
        return standardErrorResponse(ErrorCode.MISSING_REQUIRED_FIELD, "No organization context");
      }

      const userOrgId = organizationId;
      
      // Fetch organization with hierarchy data
      const userOrg = await db.query.organizations.findFirst({
        where: eq(organizations.id, userOrgId),
      });
      
      const userOrgHierarchyPath = userOrg?.hierarchyPath?.join(',') || '';

      const body = await request.json();
    // Validate request body
    const validation = clause-libraryCompareSchema.safeParse(body);
    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request data',
        validation.error.errors
      );
    }
    
    const { clauseIds, comparisonNotes } = validation.data;
      const { clauseIds, comparisonNotes } = body;

      // Validate input
      if (!clauseIds || !Array.isArray(clauseIds) || clauseIds.length < 2) {
        return NextResponse.json(
          { error: "Must provide at least 2 clause IDs to compare" },
          { status: 400 }
        );
      }

      if (clauseIds.length > 10) {
        return NextResponse.json(
          { error: "Cannot compare more than 10 clauses at once" },
          { status: 400 }
        );
      }

      // Fetch clauses with RLS enforcement
      const clauses = await withRLSContext({ organizationId: userOrgId }, async (db) => {
        return await db.query.sharedClauseLibrary.findMany({
          where: (c, { inArray }) => inArray(c.id, clauseIds),
          with: {
            tags: true,
            sourceOrganization: {
              columns: {
                id: true,
                name: true,
                organizationType: true,
              },
            },
          },
        });
      });

      if (clauses.length !== clauseIds.length) {
        return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'One or more clause IDs not found'
    );
      }

      // Check access permissions for each clause
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
                await validateSharingLevel(userId, clause.sourceOrganizationId, 'federation');
                hasAccess = true;
              } catch (error) {
                hasAccess = false;
              }
              break;
            
            case "congress":
              // Validate congress-level (CLC) access using hierarchy
              try {
                await validateSharingLevel(userId, clause.sourceOrganizationId, 'congress');
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

        if (!hasAccess) {
          return NextResponse.json(
            { error: `Access denied to clause ${clause.id}` },
            { status: 403 }
          );
        }

        accessibleClauses.push(clause);
      }

      // Log comparison in history with RLS
      const comparisonLog: NewClauseComparison = {
        userId,
        organizationId: userOrgId,
        clauseIds: clauseIds,
        comparisonNotes: comparisonNotes || null,
      };

      await withRLSContext({ organizationId: userOrgId }, async (db) => {
        return await db.insert(clauseComparisonsHistory).values(comparisonLog);
      });

      // Increment comparison count for each clause
      for (const clause of accessibleClauses) {
        await withRLSContext({ organizationId: userOrgId }, async (db) => {
          return await db
            .update(sharedClauseLibrary)
            .set({
              comparisonCount: (clause.comparisonCount ?? 0) + 1,
              updatedAt: new Date(),
            })
            .where(eq(sharedClauseLibrary.id, clause.id));
        });
      }

      // Analyze differences (basic implementation)
      const differences = highlightDifferences(accessibleClauses);
      const comparison = {
        clauses: accessibleClauses,
        analysis: {
          commonKeywords: extractCommonKeywords(accessibleClauses),
          differences: {
            clauseTypes: differences.clauseTypes,
            organizationLevels: differences.organizationLevels,
            sectors: differences.sectors,
            provinces: differences.provinces,
            dateRanges: differences.effectiveDateRange.earliest && differences.effectiveDateRange.latest
              ? `${new Date(differences.effectiveDateRange.earliest).toLocaleDateString()} - ${new Date(differences.effectiveDateRange.latest).toLocaleDateString()}`
              : "",
            sharingLevels: differences.sharingLevels,
          },
          statistics: {
            totalClauses: accessibleClauses.length,
            averageTextLength: Math.round(
              accessibleClauses.reduce((sum, c) => sum + c.clauseText.length, 0) / accessibleClauses.length
            ),
            uniqueTypes: new Set(accessibleClauses.map(c => c.clauseType)).size,
            uniqueSectors: new Set(accessibleClauses.map(c => c.sector).filter(Boolean)).size,
            uniqueProvinces: new Set(accessibleClauses.map(c => c.province).filter(Boolean)).size,
          },
        },
      };

      return NextResponse.json(comparison);

    } catch (error) {
      logger.error('Error comparing clauses', error as Error, {      correlationId: request.headers.get('x-correlation-id')
      });
      return NextResponse.json(
        { 
          error: "Failed to compare clauses",
          details: error instanceof Error ? error.message : String(error)
        },
        { status: 500 }
      );
    }
    })(request);
};

// Helper: Extract common keywords from clauses
function extractCommonKeywords(clauses: Array<Record<string, unknown>>): string[] {
  const allWords = clauses.flatMap(c => {
    const text = `${c.clauseTitle} ${c.clauseText}`.toLowerCase();
    return text.match(/\b[a-z]{4,}\b/g) || [];
  });

  const wordCounts = allWords.reduce((acc, word) => {
    acc[word] = (acc[word] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Return words that appear in more than half the clauses
  const threshold = clauses.length / 2;
  return Object.entries(wordCounts)
    .filter(([_, count]) => count >= threshold)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word]) => word);
}

// Helper: Highlight key differences
function highlightDifferences(clauses: Array<Record<string, unknown>>): any {
  return {
    clauseTypes: Array.from(new Set(clauses.map(c => c.clauseType))),
    organizationLevels: Array.from(new Set(clauses.map(c => c.sourceOrganization?.organizationLevel))),
    sectors: Array.from(new Set(clauses.map(c => c.sector).filter(Boolean))),
    provinces: Array.from(new Set(clauses.map(c => c.province).filter(Boolean))),
    effectiveDateRange: {
      earliest: clauses.reduce((min, c) => 
        !c.effectiveDate ? min : (!min || c.effectiveDate < min ? c.effectiveDate : min), 
        null
      ),
      latest: clauses.reduce((max, c) => 
        !c.effectiveDate ? max : (!max || c.effectiveDate > max ? c.effectiveDate : max), 
        null
      ),
    },
    sharingLevels: Array.from(new Set(clauses.map(c => c.sharingLevel))),
  };
}


