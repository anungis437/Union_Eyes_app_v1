import { NextRequest, NextResponse } from "next/server";

import { db } from "@/db/db";
import { claims } from "@/db/schema/claims-schema";
import { eq } from "drizzle-orm";
import { getClaimWorkflowStatus } from "@/lib/workflow-engine";
import { requireUser } from '@/lib/auth/unified-auth';

/**
 * GET /api/claims/[id]/workflow
 * Get workflow status and allowed transitions for a claim
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await requireUser();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const claimNumber = params.id;

    // Get claim
    const [claim] = await db
      .select()
      .from(claims)
      .where(eq(claims.claimNumber, claimNumber))
      .limit(1);

    if (!claim) {
      return NextResponse.json(
        { error: "Claim not found" },
        { status: 404 }
      );
    }

    // Check if user has access (claim owner or assigned steward)
    if (claim.memberId !== userId && claim.assignedTo !== userId) {
      return NextResponse.json(
        { error: "Unauthorized to view this claim" },
        { status: 403 }
      );
    }

    // Get workflow status
    const workflowStatus = getClaimWorkflowStatus(claim);

    return NextResponse.json({
      success: true,
      workflow: workflowStatus,
    });
  } catch (error) {
    console.error("Error getting workflow status:", error);
    return NextResponse.json(
      { error: "Failed to get workflow status" },
      { status: 500 }
    );
  }
}
