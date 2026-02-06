import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import { claims } from "@/db/schema/claims-schema";
import { eq, desc, and, or, like, sql } from "drizzle-orm";
import { withTenantAuth } from "@/lib/tenant-middleware";

/**
 * GET /api/claims
 * Fetch all claims with optional filtering
 * Protected by tenant middleware - only returns claims for the user's current tenant
 */
export const GET = withTenantAuth(async (request: NextRequest, context) => {
  try {
    const { tenantId, userId } = context;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const search = searchParams.get("search");
    const memberId = searchParams.get("memberId");
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build query conditions - always filter by tenant
    const conditions = [eq(claims.organizationId, tenantId)];
    
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
        ) as any
      );
    }
    
    if (memberId) {
      conditions.push(eq(claims.memberId, memberId));
    }

    // Execute query - tenant filter is always applied via conditions
    const result = await db
      .select()
      .from(claims)
      .where(and(...conditions))
      .orderBy(desc(claims.createdAt))
      .limit(limit)
      .offset(offset);

    // Count total for pagination - tenant filter is always applied
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(claims)
      .where(and(...conditions));

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
});

/**
 * POST /api/claims
 * Create a new claim
 * Protected by tenant middleware - claim will be created in the user's current tenant
 */
export const POST = withTenantAuth(async (request: NextRequest, context) => {
  try {
    const { tenantId, userId } = context;

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

    // Generate claim number
    const year = new Date().getFullYear();
    const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
    const claimNumber = `CLM-${year}-${randomNum}`;

    // Create claim
    const [newClaim] = await db
      .insert(claims)
      .values({
        claimNumber,
        organizationId: tenantId,
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
});
