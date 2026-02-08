import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * Phase 5B: Shared Clause Library API - Compare Clauses
 * Route: /api/clause-library/compare
 * Methods: POST
 */

import { NextRequest, NextResponse } from "next/server";
import { db, organizations } from "@/db";
import { 
  sharedClauseLibrary,
  clauseComparisonsHistory,
  NewClauseComparison
} from "@/db/schema";
import { inArray, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { logger } from '@/lib/logger';
import { z } from "zod";
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";

// POST /api/clause-library/compare - Compare multiple clauses
export const POST = async (request: NextRequest) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
    const { userId } = context;

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

      // Fetch clauses using explicit select to avoid automatic joins
      const clauses = await db.query.sharedClauseLibrary.findMany({
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

      if (clauses.length !== clauseIds.length) {
        return NextResponse.json(
          { error: "One or more clause IDs not found" },
          { status: 404 }
        );
      }

      // Check access permissions for each clause
      const accessibleClauses = [];
      for (const clause of clauses) {
        const isOwner = clause.sourceOrganizationId === userOrgId;
        let hasAccess = isOwner;

        if (!isOwner) {
          const sharingLevel = clause.sharingLevel;
          // TODO: Implement hierarchy-based access control when tenant hierarchy is ready

          switch (sharingLevel) {
            case "private":
              hasAccess = clause.sharedWithOrgIds?.includes(userOrgId) || false;
              break;
            
            case "federation":
              // TODO: Check federation hierarchy when implemented
              // Temporarily allow access until hierarchy is built
              hasAccess = true;
              break;
            
            case "congress":
              // TODO: Check CLC membership when implemented
              // Temporarily allow access until hierarchy is built
              hasAccess = true;
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

      // Log comparison in history
      const comparisonLog: NewClauseComparison = {
        userId,
        organizationId: userOrgId,
        clauseIds: clauseIds,
        comparisonNotes: comparisonNotes || null,
      };

      await db.insert(clauseComparisonsHistory).values(comparisonLog);

      // Increment comparison count for each clause
      for (const clause of accessibleClauses) {
        await db
          .update(sharedClauseLibrary)
          .set({
            comparisonCount: (clause.comparisonCount ?? 0) + 1,
            updatedAt: new Date(),
          })
          .where(eq(sharedClauseLibrary.id, clause.id));
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
function extractCommonKeywords(clauses: any[]): string[] {
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
function highlightDifferences(clauses: any[]): any {
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

