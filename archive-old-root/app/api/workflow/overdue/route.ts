import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getOverdueClaims, getClaimsApproachingDeadline } from "@/lib/workflow-engine";

/**
 * GET /api/workflow/overdue
 * Get all overdue claims (requires admin/steward access)
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // TODO: Add role-based access control (only stewards/admins should see this)
    // For now, allowing all authenticated users

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
