import { NextRequest, NextResponse } from "next/server";

import { getOverdueClaims, getClaimsApproachingDeadline } from "@/lib/workflow-engine";
import { requireApiAuth } from '@/lib/api-auth-guard';

/**
 * GET /api/workflow/overdue
 * Get all overdue claims (requires admin/steward access)
 * 
 * GUARDED: requireApiAuth with tenant isolation
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication guard with tenant isolation
    const { userId, organizationId } = await requireApiAuth({
      tenant: true,
      roles: ['admin', 'steward'],
    });

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type") || "overdue";

    let result;
    if (type === "approaching") {
      result = await getClaimsApproachingDeadline();
    } else {
      result = await getOverdueClaims();
    }

    return NextResponse.json({
      success: true,
      count: result.length,
      claims: result,
    });
  } catch (error) {
    console.error("Error getting overdue claims:", error);
    return NextResponse.json(
      { error: "Failed to get overdue claims" },
      { status: 500 }
    );
  }
}
