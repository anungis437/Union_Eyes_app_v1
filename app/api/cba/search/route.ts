import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/db";
import { collectiveAgreements, cbaClause } from "@/db/schema";
import { eq, desc, and, or, like, gte, lte, sql } from "drizzle-orm";

/**
 * POST /api/cba/search
 * Search collective bargaining agreements with filters
 * 
 * Body: {
 *   query?: string,
 *   filters?: {
 *     jurisdiction?: string[],
 *     employer?: string,
 *     union?: string,
 *     status?: string[],
 *     dateRange?: { start: string, end: string }
 *   },
 *   limit?: number,
 *   offset?: number
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { query, filters = {}, limit = 20, offset = 0 } = body;

    // Build query conditions
    const conditions = [];
    
    // Text search across title, employer, union
    if (query) {
      conditions.push(
        or(
          like(collectiveAgreements.title, `%${query}%`),
          like(collectiveAgreements.employerName, `%${query}%`),
          like(collectiveAgreements.unionName, `%${query}%`),
          like(collectiveAgreements.cbaNumber, `%${query}%`)
        )
      );
    }

    // Filter by jurisdiction
    if (filters.jurisdiction && filters.jurisdiction.length > 0) {
      conditions.push(
        or(...filters.jurisdiction.map((j: string) => 
          eq(collectiveAgreements.jurisdiction, j as any)
        ))
      );
    }

    // Filter by employer
    if (filters.employer) {
      conditions.push(like(collectiveAgreements.employerName, `%${filters.employer}%`));
    }

    // Filter by union
    if (filters.union) {
      conditions.push(like(collectiveAgreements.unionName, `%${filters.union}%`));
    }

    // Filter by status
    if (filters.status && filters.status.length > 0) {
      conditions.push(
        or(...filters.status.map((s: string) => 
          eq(collectiveAgreements.status, s as any)
        ))
      );
    }

    // Filter by date range
    if (filters.dateRange) {
      if (filters.dateRange.start) {
        conditions.push(gte(collectiveAgreements.effectiveDate, filters.dateRange.start));
      }
      if (filters.dateRange.end) {
        conditions.push(lte(collectiveAgreements.expiryDate, filters.dateRange.end));
      }
    }

    // Execute query
    const results = await db
      .select({
        id: collectiveAgreements.id,
        cbaNumber: collectiveAgreements.cbaNumber,
        title: collectiveAgreements.title,
        jurisdiction: collectiveAgreements.jurisdiction,
        employerName: collectiveAgreements.employerName,
        employerId: collectiveAgreements.employerId,
        unionName: collectiveAgreements.unionName,
        unionLocal: collectiveAgreements.unionLocal,
        effectiveDate: collectiveAgreements.effectiveDate,
        expiryDate: collectiveAgreements.expiryDate,
        status: collectiveAgreements.status,
        industrySector: collectiveAgreements.industrySector,
        language: collectiveAgreements.language,
        documentUrl: collectiveAgreements.documentUrl,
        createdAt: collectiveAgreements.createdAt,
        updatedAt: collectiveAgreements.updatedAt,
      })
      .from(collectiveAgreements)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(collectiveAgreements.effectiveDate))
      .limit(limit)
      .offset(offset);

    // Count total for pagination
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(collectiveAgreements)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return NextResponse.json({
      results,
      total: countResult.count,
      limit,
      offset,
      hasMore: offset + limit < countResult.count,
    });
  } catch (error) {
    console.error("Error searching CBAs:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cba/search
 * Quick search for recent CBAs (used by dashboard)
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const recent = searchParams.get("recent") === "true";
    const limit = parseInt(searchParams.get("limit") || "10");

    let results;

    if (recent) {
      // Get most recently added CBAs
      results = await db
        .select({
          id: collectiveAgreements.id,
          cbaNumber: collectiveAgreements.cbaNumber,
          title: collectiveAgreements.title,
          jurisdiction: collectiveAgreements.jurisdiction,
          employerName: collectiveAgreements.employerName,
          unionName: collectiveAgreements.unionName,
          effectiveDate: collectiveAgreements.effectiveDate,
          expiryDate: collectiveAgreements.expiryDate,
          status: collectiveAgreements.status,
          createdAt: collectiveAgreements.createdAt,
        })
        .from(collectiveAgreements)
        .orderBy(desc(collectiveAgreements.createdAt))
        .limit(limit);
    } else {
      // Get active CBAs
      results = await db
        .select({
          id: collectiveAgreements.id,
          cbaNumber: collectiveAgreements.cbaNumber,
          title: collectiveAgreements.title,
          jurisdiction: collectiveAgreements.jurisdiction,
          employerName: collectiveAgreements.employerName,
          unionName: collectiveAgreements.unionName,
          effectiveDate: collectiveAgreements.effectiveDate,
          expiryDate: collectiveAgreements.expiryDate,
          status: collectiveAgreements.status,
        })
        .from(collectiveAgreements)
        .where(eq(collectiveAgreements.status, "active"))
        .orderBy(desc(collectiveAgreements.effectiveDate))
        .limit(limit);
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Error fetching CBAs:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
