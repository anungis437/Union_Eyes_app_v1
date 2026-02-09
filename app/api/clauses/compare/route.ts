import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * Clause Comparison API Route
 * POST /api/clauses/compare - Compare multiple clauses
 * GET /api/clauses/compare - List saved comparisons
 */

import { NextRequest, NextResponse } from "next/server";
import { 
  compareClauses,
  saveClauseComparison 
} from "@/lib/services/clause-service";
import { z } from "zod";
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';

export const POST = async (request: NextRequest) => {
  return withRoleAuth(20, async (request, context) => {
    const { userId, organizationId: contextOrganizationId } = context;

  try {
      const body = await request.json();
      const { 
        clauseIds, 
        analysisType = "all",
        save = false,
        comparisonName,
        organizationId
      } = body;
  if (organizationId && organizationId !== contextOrganizationId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }


      if (!clauseIds || !Array.isArray(clauseIds) || clauseIds.length < 2) {
        return NextResponse.json(
          { error: "At least 2 clause IDs are required for comparison" },
          { status: 400 }
        );
      }

      if (clauseIds.length > 10) {
        return NextResponse.json(
          { error: "Maximum 10 clauses can be compared at once" },
          { status: 400 }
        );
      }

      // Perform comparison
      const result = await compareClauses({
        clauseIds,
        analysisType
      });

      // Optionally save the comparison
      if (save) {
        if (!comparisonName || !organizationId) {
          return NextResponse.json(
            { error: "comparisonName and organizationId are required to save comparison" },
            { status: 400 }
          );
        }

        const clauseType = result.clauses[0]?.clauseType || "other";

        const savedComparison = await saveClauseComparison(
          comparisonName,
          clauseType,
          clauseIds,
          organizationId, userId,
          {
            similarities: result.similarities,
            differences: result.differences,
            bestPractices: result.bestPractices,
            recommendations: result.recommendations
          }
        );

        return NextResponse.json({ 
          ...result,
          savedComparison
        });
      }

      return NextResponse.json(result);
    } catch (error) {
      console.error("Error comparing clauses:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
    })(request);
};
