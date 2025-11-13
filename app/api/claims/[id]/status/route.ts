import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { updateClaimStatus, addClaimNote } from "@/lib/workflow-engine";

/**
 * PATCH /api/claims/[id]/status
 * Update claim status with workflow validation
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const claimId = params.id;
    const body = await request.json();
    const { status: newStatus, notes } = body;

    if (!newStatus) {
      return NextResponse.json(
        { error: "Status is required" },
        { status: 400 }
      );
    }

    // Update status with workflow validation
    const result = await updateClaimStatus(claimId, newStatus, userId, notes);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      claim: result.claim,
      message: "Status updated successfully",
    });
  } catch (error) {
    console.error("Error updating claim status:", error);
    return NextResponse.json(
      { error: "Failed to update status" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/claims/[id]/status/note
 * Add a note to the claim
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const claimId = params.id;
    const body = await request.json();
    const { message, isInternal = true } = body;

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const result = await addClaimNote(claimId, message, userId, isInternal);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Note added successfully",
    });
  } catch (error) {
    console.error("Error adding claim note:", error);
    return NextResponse.json(
      { error: "Failed to add note" },
      { status: 500 }
    );
  }
}
