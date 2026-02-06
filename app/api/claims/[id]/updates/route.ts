import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/db";
import { claimUpdates } from "@/db/schema/claims-schema";
import { desc, eq } from "drizzle-orm";

/**
 * GET /api/claims/[id]/updates
 * Fetch all updates for a specific claim
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

    const claimId = params.id;

    // Fetch updates
    const updates = await db
      .select()
      .from(claimUpdates)
      .where(eq(claimUpdates.claimId, claimId))
      .orderBy(desc(claimUpdates.createdAt));

    return NextResponse.json({ updates });
  } catch (error) {
    console.error("Error fetching claim updates:", error);
    return NextResponse.json(
      { error: "Failed to fetch claim updates" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/claims/[id]/updates
 * Add a new update to a claim
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const claimId = params.id;
    const body = await request.json();

    // Validate required fields
    if (!body.updateType || !body.message) {
      return NextResponse.json(
        { error: "Update type and message are required" },
        { status: 400 }
      );
    }

    // Insert new update
    const [newUpdate] = await db
      .insert(claimUpdates)
      .values({
        claimId,
        updateType: body.updateType,
        message: body.message,
        createdBy: userId,
        isInternal: body.isInternal || false,
        metadata: body.metadata || {},
      })
      .returning();

    return NextResponse.json({
      update: newUpdate,
      message: "Update added successfully",
    }, { status: 201 });
  } catch (error) {
    console.error("Error adding claim update:", error);
    return NextResponse.json(
      { error: "Failed to add claim update" },
      { status: 500 }
    );
  }
}
