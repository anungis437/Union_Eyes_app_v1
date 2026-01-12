import { NextRequest, NextResponse } from "next/server";
import { getSystemStats } from "@/actions/admin-actions";
import { logger } from "@/lib/logger";
import { requireAdmin } from "@/lib/admin-auth";

/**
 * GET /api/admin/stats/overview
 * Get system-wide statistics
 */
export async function GET(request: NextRequest) {
  try {
    // Check admin authorization
    const auth = await requireAdmin();
    if (!auth.authorized) {
      return auth.response;
    }

    const stats = await getSystemStats();

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error("Failed to fetch system stats", error);
    return NextResponse.json(
      { error: "Failed to fetch statistics" },
      { status: 500 }
    );
  }
}
