/**
 * Clause Search API Route
 * POST /api/clauses/search - Search clauses across CBAs
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { searchClauses } from "@/lib/services/clause-service";

/**
 * POST /api/clauses/search
 * Search clauses across CBAs
 * 
 * Body: {
 *   query: string,
 *   filters?: {
 *     clauseType?: string[],
 *     cbaId?: string
 *   },
 *   limit?: number
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { query, filters = {}, limit = 50 } = body;

    if (!query) {
      return NextResponse.json(
        { error: "query is required" },
        { status: 400 }
      );
    }

    const results = await searchClauses(query, filters, limit);

    return NextResponse.json({ 
      clauses: results,
      count: results.length
    });
  } catch (error) {
    console.error("Error searching clauses:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
