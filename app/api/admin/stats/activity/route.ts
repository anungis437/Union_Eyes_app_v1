import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getRecentActivity } from "@/actions/admin-actions";
import { db } from "@/db/db";
import { tenantUsers } from "@/db/schema/user-management-schema";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/logger";

/**
 * GET /api/admin/stats/activity
 * Get recent activity feed
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check admin role
    const adminCheck = await db
      .select({ role: tenantUsers.role })
      .from(tenantUsers)
      .where(eq(tenantUsers.userId, userId))
      .limit(1);

    if (adminCheck.length === 0 || adminCheck[0].role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
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
