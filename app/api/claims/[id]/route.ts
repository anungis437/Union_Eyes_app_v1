import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/db";
import { claims, claimUpdates } from "@/db/schema/claims-schema";
import { eq, desc } from "drizzle-orm";

/**
 * GET /api/claims/[id]
 * Fetch a single claim by ID with updates
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const claimNumber = params.id;

    // Fetch claim by claim number
    const [claim] = await db
      .select()
      .from(claims)
      .where(eq(claims.claimNumber, claimNumber));

    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    // Fetch claim updates using the claim's UUID
    const updates = await db
      .select()
      .from(claimUpdates)
      .where(eq(claimUpdates.claimId, claim.claimId))
      .orderBy(desc(claimUpdates.createdAt));

    return NextResponse.json({
      claim,
      updates,
    });
  } catch (error) {
    console.error("Error fetching claim:", error);
    return NextResponse.json(
      { error: "Failed to fetch claim" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/claims/[id]
 * Update a claim
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const claimNumber = params.id;
    const body = await request.json();

    // Check if claim exists
    const [existingClaim] = await db
      .select()
      .from(claims)
      .where(eq(claims.claimNumber, claimNumber));

    if (!existingClaim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    // Update claim
    const [updatedClaim] = await db
      .update(claims)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(claims.claimId, existingClaim.claimId))
      .returning();

    return NextResponse.json({
      claim: updatedClaim,
      message: "Claim updated successfully",
    });
  } catch (error) {
    console.error("Error updating claim:", error);
    return NextResponse.json(
      { error: "Failed to update claim" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/claims/[id]
 * Delete a claim (soft delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const claimNumber = params.id;

    // Check if claim exists
    const [existingClaim] = await db
      .select()
      .from(claims)
      .where(eq(claims.claimNumber, claimNumber));

    if (!existingClaim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    // Soft delete by setting closedAt
    await db
      .update(claims)
      .set({
        status: "closed",
        closedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(claims.claimId, existingClaim.claimId));

    return NextResponse.json({
      message: "Claim deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting claim:", error);
    return NextResponse.json(
      { error: "Failed to delete claim" },
      { status: 500 }
    );
  }
}
