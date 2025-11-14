import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/db";
import { claims } from "@/db/schema/claims-schema";
import { eq, desc, and, or, like, sql } from "drizzle-orm";
import { getTenantIdForUser } from "@/lib/tenant-utils";

/**
 * GET /api/claims
 * Fetch all claims with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const search = searchParams.get("search");
    const memberId = searchParams.get("memberId");
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build query conditions
    const conditions = [];
    
    if (status && status !== "all") {
      conditions.push(eq(claims.status, status as any));
    }
    
    if (priority && priority !== "all") {
      conditions.push(eq(claims.priority, priority as any));
    }
    
    if (search) {
      conditions.push(
        or(
          like(claims.claimNumber, `%${search}%`),
          like(claims.description, `%${search}%`)
        )
      );
    }
    
    if (memberId) {
      conditions.push(eq(claims.memberId, memberId));
    }

    // Execute query
    const result = await db
      .select()
      .from(claims)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(claims.createdAt))
      .limit(limit)
      .offset(offset);

    // Count total for pagination
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(claims)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const total = totalResult[0]?.count || 0;

    return NextResponse.json({
      claims: result,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error("Error fetching claims:", error);
    // Return empty results instead of error
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");
    
    return NextResponse.json({
      claims: [],
      pagination: {
        total: 0,
        limit,
        offset,
        hasMore: false,
      },
      error: error instanceof Error ? error.message : "Failed to fetch claims"
    });
  }
}

/**
 * POST /api/claims
 * Create a new claim
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate required fields
    const required = ["claimType", "incidentDate", "location", "description", "desiredOutcome"];
    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Get tenant ID for the authenticated user
    const tenantId = await getTenantIdForUser(userId);

    // Generate claim number
    const year = new Date().getFullYear();
    const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
    const claimNumber = `CLM-${year}-${randomNum}`;

    // Create claim
    const [newClaim] = await db
      .insert(claims)
      .values({
        claimNumber,
        tenantId,
        memberId: userId,
        isAnonymous: body.isAnonymous ?? true,
        claimType: body.claimType,
        status: "submitted",
        priority: body.priority || "medium",
        incidentDate: new Date(body.incidentDate),
        location: body.location,
        description: body.description,
        desiredOutcome: body.desiredOutcome,
        witnessesPresent: body.witnessesPresent || false,
        witnessDetails: body.witnessDetails || null,
        previouslyReported: body.previouslyReported || false,
        previousReportDetails: body.previousReportDetails || null,
        attachments: body.attachments || [],
        voiceTranscriptions: body.voiceTranscriptions || [],
        metadata: body.metadata || {},
      })
      .returning();

    return NextResponse.json(
      { 
        claim: newClaim,
        message: "Claim submitted successfully" 
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating claim:", error);
    return NextResponse.json(
      { error: "Failed to create claim" },
      { status: 500 }
    );
  }
}
