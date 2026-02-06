/**
 * Clauses API Routes - Main endpoints for CBA clauses
 * GET /api/clauses - List clauses with filtering
 * POST /api/clauses - Create a new clause
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { 
  listClauses, 
  createClause,
  bulkCreateClauses,
  searchClauses,
  getClausesByType,
  getClauseTypeDistribution
} from "@/lib/services/clause-service";

/**
 * GET /api/clauses
 * List clauses with filtering and pagination
 * 
 * Query params:
 * - cbaId: string - filter by CBA
 * - clauseType: string[] (comma-separated)
 * - articleNumber: string
 * - confidenceMin: number
 * - searchQuery: string
 * - page: number
 * - limit: number
 * - byType: string - get clauses of specific type
 * - distribution: boolean - get clause type distribution for CBA
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    
    // Check for special modes
    const byType = searchParams.get("byType");
    const distribution = searchParams.get("distribution") === "true";
    const cbaId = searchParams.get("cbaId");

    // Return clause type distribution
    if (distribution && cbaId) {
      const dist = await getClauseTypeDistribution(cbaId);
      return NextResponse.json({ distribution: dist });
    }

    // Return clauses by type
    if (byType) {
      const limit = parseInt(searchParams.get("limit") || "100");
      const clauses = await getClausesByType(byType, { limit });
      return NextResponse.json({ clauses });
    }

    // Build filters
    const filters: any = {};
    
    if (cbaId) {
      filters.cbaId = cbaId;
    }

    const clauseType = searchParams.get("clauseType");
    if (clauseType) {
      filters.clauseType = clauseType.split(",");
    }

    const articleNumber = searchParams.get("articleNumber");
    if (articleNumber) {
      filters.articleNumber = articleNumber;
    }

    const confidenceMin = searchParams.get("confidenceMin");
    if (confidenceMin) {
      filters.confidenceMin = parseFloat(confidenceMin);
    }

    const searchQuery = searchParams.get("searchQuery");
    if (searchQuery) {
      filters.searchQuery = searchQuery;
    }

    const pageNumber = searchParams.get("pageNumber");
    if (pageNumber) {
      filters.pageNumber = parseInt(pageNumber);
    }

    // Pagination
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    const result = await listClauses(filters, { page, limit });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error listing clauses:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/clauses
 * Create a new clause or bulk create clauses
 * 
 * Body: NewClause object or array of NewClause objects
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Check if bulk create
    if (Array.isArray(body)) {
      // Validate all required fields
      for (const clause of body) {
        if (!clause.cbaId || !clause.clauseNumber || !clause.clauseType || !clause.title || !clause.content) {
          return NextResponse.json(
            { error: "All clauses must have cbaId, clauseNumber, clauseType, title, and content" },
            { status: 400 }
          );
        }
      }

      const clauses = await bulkCreateClauses(body);
      return NextResponse.json({ clauses, count: clauses.length }, { status: 201 });
    }

    // Single clause creation
    // Validate required fields
    if (!body.cbaId) {
      return NextResponse.json(
        { error: "cbaId is required" },
        { status: 400 }
      );
    }

    if (!body.clauseNumber) {
      return NextResponse.json(
        { error: "clauseNumber is required" },
        { status: 400 }
      );
    }

    if (!body.clauseType) {
      return NextResponse.json(
        { error: "clauseType is required" },
        { status: 400 }
      );
    }

    if (!body.title) {
      return NextResponse.json(
        { error: "title is required" },
        { status: 400 }
      );
    }

    if (!body.content) {
      return NextResponse.json(
        { error: "content is required" },
        { status: 400 }
      );
    }

    // Create clause
    const clause = await createClause(body);

    return NextResponse.json({ clause }, { status: 201 });
  } catch (error) {
    console.error("Error creating clause:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
