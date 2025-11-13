import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/db";
import { cbaClause, clauseComparisons } from "@/db/schema";
import { inArray } from "drizzle-orm";

/**
 * POST /api/cba/clauses/compare
 * Compare clauses across multiple CBAs
 * 
 * Body: {
 *   clauseIds: string[],
 *   analysisType: 'wages' | 'benefits' | 'working_conditions' | 'general'
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { clauseIds, analysisType = "general" } = body;

    if (!clauseIds || !Array.isArray(clauseIds) || clauseIds.length < 2) {
      return NextResponse.json(
        { error: "At least 2 clause IDs required for comparison" },
        { status: 400 }
      );
    }

    // Fetch all clauses
    const clauses = await db
      .select()
      .from(cbaClause)
      .where(inArray(cbaClause.id, clauseIds));

    if (clauses.length !== clauseIds.length) {
      return NextResponse.json(
        { error: "Some clauses not found" },
        { status: 404 }
      );
    }

    // Check if comparison already exists
    const existingComparison = await db
      .select()
      .from(clauseComparisons)
      .where(inArray(clauseComparisons.id, clauseIds))
      .limit(1);

    if (existingComparison.length > 0) {
      return NextResponse.json(existingComparison[0]);
    }

    // Perform comparison analysis
    // In production, this would call OpenAI API for detailed analysis
    // For now, return a structured comparison based on clause content
    const similarities: string[] = [];
    const differences: string[] = [];
    const recommendations: string[] = [];

    // Basic text comparison (simplified)
    const contentAnalysis = analyzeClauseContent(clauses, analysisType);
    
    const comparison = {
      comparisonName: `${analysisType} comparison - ${new Date().toISOString()}`,
      clauseType: clauses[0].clauseType, // Use first clause's type
      tenantId: "00000000-0000-0000-0000-000000000000", // TODO: Get from user context
      clauseIds,
      analysisResults: {
        similarities: contentAnalysis.similarities.map(s => ({ description: s, clauseIds })),
        differences: contentAnalysis.differences.map(d => ({ description: d, clauseIds, impact: "medium" })),
        bestPractices: contentAnalysis.bestPractices.map((bp, i) => ({ description: bp, clauseId: clauseIds[i % clauseIds.length], reason: "Industry standard" })),
        recommendations: contentAnalysis.recommendations,
      },
      industryAverage: contentAnalysis.industryAverage,
      marketPosition: contentAnalysis.marketPosition,
      createdBy: userId,
    };

    // Store comparison for future reference
    const [savedComparison] = await db
      .insert(clauseComparisons)
      .values(comparison)
      .returning();

    return NextResponse.json(savedComparison);
  } catch (error) {
    console.error("Error comparing clauses:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Analyze clause content and extract insights
 * In production, this would use OpenAI API for sophisticated analysis
 */
function analyzeClauseContent(clauses: any[], analysisType: string) {
  const similarities: string[] = [];
  const differences: string[] = [];
  const bestPractices: string[] = [];
  const recommendations: string[] = [];

  // Extract common themes
  const allContent = clauses.map(c => c.content.toLowerCase()).join(" ");
  
  if (analysisType === "wages") {
    // Look for wage-related patterns
    if (allContent.includes("increase") || allContent.includes("raise")) {
      similarities.push("All agreements include provisions for wage increases");
    }
    if (allContent.includes("step") || allContent.includes("progression")) {
      bestPractices.push("Wage progression schedules are clearly defined");
    }
    recommendations.push("Consider benchmarking against federal public service wage grids");
  }

  if (analysisType === "benefits") {
    if (allContent.includes("health") || allContent.includes("dental")) {
      similarities.push("Health and dental benefits are provided");
    }
    if (allContent.includes("employer paid") || allContent.includes("100%")) {
      bestPractices.push("Employer-paid benefits provide strong coverage");
    }
    recommendations.push("Compare employer contribution rates with industry standards");
  }

  // Generic differences
  if (clauses.length > 1) {
    const lengths = clauses.map(c => c.content.length);
    const maxLength = Math.max(...lengths);
    const minLength = Math.min(...lengths);
    
    if (maxLength > minLength * 2) {
      differences.push("Clause detail and comprehensiveness varies significantly across agreements");
    }
  }

  return {
    similarities,
    differences,
    bestPractices,
    recommendations,
    industryAverage: {
      description: "Industry average data pending full dataset",
      value: null,
    },
    marketPosition: "at_market" as const,
  };
}

/**
 * GET /api/cba/clauses/compare/[id]
 * Retrieve a previously saved comparison
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const clauseIds = searchParams.get("clauseIds")?.split(",") || [];

    if (clauseIds.length === 0) {
      return NextResponse.json(
        { error: "Clause IDs required" },
        { status: 400 }
      );
    }

    // Find comparisons involving these clauses
    const comparisons = await db
      .select()
      .from(clauseComparisons)
      .where(inArray(clauseComparisons.id, clauseIds))
      .limit(10);

    return NextResponse.json({ comparisons });
  } catch (error) {
    console.error("Error fetching comparisons:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
