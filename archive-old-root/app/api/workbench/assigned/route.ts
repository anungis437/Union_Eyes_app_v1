/**
 * Workbench API - Get claims assigned to current user
 * 
 * GET /api/workbench/assigned
 * Returns all claims assigned to the authenticated user (stewards/officers)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getClaimsAssignedToUser } from "@/db/queries/claims-queries";

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Fetch claims assigned to this user
    const assignedClaims = await getClaimsAssignedToUser(userId);

    return NextResponse.json({
      claims: assignedClaims,
      total: assignedClaims.length,
      userId,
    });

  } catch (error) {
    console.error("Error fetching assigned claims:", error);
    return NextResponse.json(
      { error: "Failed to fetch assigned claims" },
      { status: 500 }
    );
  }
}
