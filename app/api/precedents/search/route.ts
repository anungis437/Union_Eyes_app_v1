/**
 * Precedent Search API Route
 * POST /api/precedents/search - Search precedents
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { searchPrecedents } from "@/lib/services/precedent-service";

/**
 * POST /api/precedents/search
 * Search arbitration decisions/precedents
 * 
 * Body: {
 *   query: string,
 *   filters?: {
 *     precedentValue?: string[],
 *     tribunal?: string[]
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

    const results = await searchPrecedents(query, filters, limit);

    return NextResponse.json({ 
      precedents: results,
      count: results.length
    });
  } catch (error) {
    console.error("Error searching precedents:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
