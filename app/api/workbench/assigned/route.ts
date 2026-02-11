/**
 * Workbench API - Get claims assigned to current user
 * 
 * GET /api/workbench/assigned
 * Returns all claims assigned to the authenticated user (stewards/officers)
 */

import { NextRequest, NextResponse } from "next/server";
import { getClaimsAssignedToUser } from "@/db/queries/claims-queries";
import { getUserByEmail } from "@/db/queries/users-queries";
import { withOrganizationAuth } from "@/lib/organization-middleware";
import { logger } from '@/lib/logger';
import { getMemberDetailsById } from '@/lib/utils/member-data-utils';

export const GET = withOrganizationAuth(async (request: NextRequest, context) => {
  try {
    const { organizationId: organizationId, userId: clerkUserId } = context;
    
    if (!clerkUserId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get Clerk user to access email
    const { currentUser } = await import("@clerk/nextjs/server");
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
      logger.warn('No database user found for email', { email: clerkUser.emailAddresses[0].emailAddress });
      return NextResponse.json({
        claims: [],
        total: 0,
        userId: clerkUserId,
        message: "User not found in database"
      });
    }

    // Fetch claims assigned to this user for the current organization
    const assignedClaims = await getClaimsAssignedToUser(dbUser.userId, organizationId);

    // Enrich claims with member details
    const enrichedClaims = await Promise.all(
      (assignedClaims || []).map(async (claim) => {
        if (claim.isAnonymous) {
          return {
            ...claim,
            memberName: 'Anonymous Member',
            memberEmail: '',
            memberPhone: '',
          };
        }

        const memberDetails = await getMemberDetailsById(claim.memberId);
        return {
          ...claim,
          memberName: memberDetails?.name || 'Unknown Member',
          memberEmail: memberDetails?.email || '',
          memberPhone: memberDetails?.phone || '',
        };
      })
    );

    return NextResponse.json({
      claims: enrichedClaims,
      total: enrichedClaims.length,
      userId: clerkUserId,
      dbUserId: dbUser.userId,
    });

  } catch (error) {
    logger.error('Error fetching assigned claims', error as Error);
    // Return empty array instead of error to allow UI to load
    return NextResponse.json({
      claims: [],
      total: 0,
      userId: null,
      error: error instanceof Error ? error.message : "Failed to fetch assigned claims"
    });
  }
});
