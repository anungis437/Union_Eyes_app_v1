/**
 * Workbench API - Get claims assigned to current user
 * 
 * GET /api/workbench/assigned
 * Returns all claims assigned to the authenticated user (stewards/officers)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getClaimsAssignedToUser } from "@/db/queries/claims-queries";
import { getUserByEmail } from "@/db/queries/users-queries";

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const { userId: clerkUserId } = await auth();
    
    if (!clerkUserId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get Clerk user to access email
    const clerkUser = await currentUser();
    if (!clerkUser?.emailAddresses?.[0]?.emailAddress) {
      return NextResponse.json(
        { error: "User email not found" },
        { status: 400 }
      );
    }

    // Look up database user by email
    const dbUser = await getUserByEmail(clerkUser.emailAddresses[0].emailAddress);
    if (!dbUser) {
      console.log(`No database user found for email: ${clerkUser.emailAddresses[0].emailAddress}`);
      return NextResponse.json({
        claims: [],
        total: 0,
        userId: clerkUserId,
        message: "User not found in database"
      });
    }

    // Fetch claims assigned to this user using database UUID
    const assignedClaims = await getClaimsAssignedToUser(dbUser.userId);

    return NextResponse.json({
      claims: assignedClaims || [],
      total: assignedClaims?.length || 0,
      userId: clerkUserId,
      dbUserId: dbUser.userId,
    });

  } catch (error) {
    console.error("Error fetching assigned claims:", error);
    // Return empty array instead of error to allow UI to load
    return NextResponse.json({
      claims: [],
      total: 0,
      userId: null,
      error: error instanceof Error ? error.message : "Failed to fetch assigned claims"
    });
  }
}
