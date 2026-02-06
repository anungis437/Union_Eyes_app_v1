/**
 * Clause Comparison API Route
 * POST /api/clauses/compare - Compare multiple clauses
 * GET /api/clauses/compare - List saved comparisons
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { 
  compareClauses,
  saveClauseComparison 
} from "@/lib/services/clause-service";

/**
 * POST /api/clauses/compare
 * Compare multiple clauses
 * 
 * Body: {
 *   clauseIds: string[],
 *   analysisType?: "similarities" | "differences" | "best_practices" | "all",
 *   save?: boolean,
 *   comparisonName?: string,
 *   organizationId?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { 
      clauseIds, 
      analysisType = "all",
      save = false,
      comparisonName,
      organizationId
    } = body;

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
        organizationId,
        userId,
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
}
