import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSystemStats, getRecentActivity } from "@/actions/admin-actions";
import { db } from "@/db/db";
import { tenantUsers } from "@/db/schema/user-management-schema";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/logger";

/**
 * GET /api/admin/stats/overview
 * Get system-wide statistics
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
