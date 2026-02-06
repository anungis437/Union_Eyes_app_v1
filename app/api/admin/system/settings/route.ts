import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSystemConfigs, updateSystemConfig } from "@/actions/admin-actions";
import { db } from "@/db/db";
import { tenantUsers } from "@/db/schema/user-management-schema";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/logger";

/**
 * GET /api/admin/system/settings
 * Get system configurations
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
    const category = searchParams.get("category") || undefined;

    const configs = await getSystemConfigs(category);

    return NextResponse.json({
      success: true,
      data: configs,
      count: configs.length,
    });
  } catch (error) {
    logger.error("Failed to fetch system settings", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/system/settings
 * Update system configuration
 */
export async function PUT(request: NextRequest) {
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

    const body = await request.json();
    const { tenantId, category, key, value } = body;

    if (!tenantId || !category || !key || value === undefined) {
      return NextResponse.json(
        { error: "tenantId, category, key, and value are required" },
        { status: 400 }
      );
    }

    await updateSystemConfig(tenantId, category, key, value);

    logger.info("System setting updated", {
      adminId: userId,
      tenantId,
      category,
      key,
    });

    return NextResponse.json({
      success: true,
      message: "Setting updated successfully",
    });
  } catch (error) {
    logger.error("Failed to update system setting", error);
    return NextResponse.json(
      { error: "Failed to update setting" },
      { status: 500 }
    );
  }
}
