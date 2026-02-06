/**
 * Members Advanced Search API Route
 * POST /api/members/search - Advanced member search with filters
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { searchMembers, getMemberStatistics } from "@/lib/services/member-service";

/**
 * POST /api/members/search
 * Advanced member search with full-text search and filters
 * 
 * Body:
 * - organizationId: string (required)
 * - searchQuery: string
 * - filters:
 *   - status: string[]
 *   - role: string[]
 *   - department: string
 * - page: number
 * - limit: number
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    
    if (!body.organizationId) {
      return NextResponse.json({ error: "organizationId is required" }, { status: 400 });
    }

    const searchQuery = body.searchQuery || "";
    const filters = body.filters || {};
    const page = body.page || 1;
    const limit = body.limit || 50;

    const result = await searchMembers(
      body.organizationId,
      searchQuery,
      filters,
      { page, limit }
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error searching members:", error);
    return NextResponse.json(
      { error: "Failed to search members", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/members/search
 * Get member statistics
 * 
 * Query params:
 * - organizationId: string (required)
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");

    if (!organizationId) {
      return NextResponse.json({ error: "organizationId is required" }, { status: 400 });
    }

    const statistics = await getMemberStatistics(organizationId);

    return NextResponse.json(statistics);
  } catch (error) {
    console.error("Error fetching member statistics:", error);
    return NextResponse.json(
      { error: "Failed to fetch statistics", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
