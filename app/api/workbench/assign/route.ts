/**
 * Workbench API - Assign claim to user
 * 
 * POST /api/workbench/assign
 * Assigns a claim to the authenticated user
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { assignClaim } from "@/db/queries/claims-queries";

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { claimId } = body;

    if (!claimId) {
      return NextResponse.json(
        { error: "claimId is required" },
        { status: 400 }
      );
    }

    // Assign claim to current user
    const updatedClaim = await assignClaim(claimId, userId, userId);

    return NextResponse.json({
      success: true,
      claim: updatedClaim,
      message: "Claim assigned successfully"
    });

  } catch (error) {
    console.error("Error assigning claim:", error);
    return NextResponse.json(
      { error: "Failed to assign claim" },
      { status: 500 }
    );
  }
}
