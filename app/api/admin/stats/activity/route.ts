import { NextRequest, NextResponse } from "next/server";
import { getRecentActivity } from "@/actions/admin-actions";
import { logger } from "@/lib/logger";
import { requireAdmin } from "@/lib/admin-auth";

/**
 * GET /api/admin/stats/activity
 * Get recent activity feed
 */
export async function GET(request: NextRequest) {
  try {
    // Check admin authorization
    const auth = await requireAdmin();
    if (!auth.authorized) {
      return auth.response;
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "50");

    const activity = await getRecentActivity(Math.min(limit, 100));

    return NextResponse.json({
      success: true,
      data: activity,
      count: activity.length,
    });
  } catch (error) {
    logger.error("Failed to fetch activity", error);
    return NextResponse.json(
      { error: "Failed to fetch activity" },
      { status: 500 }
    );
  }
}
