import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getAdminUsers } from "@/actions/admin-actions";
import { db } from "@/db/db";
import { tenantUsers } from "@/db/schema/user-management-schema";
import { tenants } from "@/db/schema/tenant-management-schema";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/logger";

/**
 * GET /api/admin/users
 * List all users with filtering
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

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const searchQuery = searchParams.get("search") || undefined;
    const tenantId = searchParams.get("tenantId") || undefined;
    const role = searchParams.get("role") as any;

    const users = await getAdminUsers(searchQuery, tenantId, role);

    return NextResponse.json({
      success: true,
      data: users,
      count: users.length,
    });
  } catch (error) {
    logger.error("Failed to fetch users", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/users
 * Create new user or add user to tenant
 */
export async function POST(request: NextRequest) {
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
    const { userId: targetUserId, tenantId, role = "member" } = body;

    if (!targetUserId || !tenantId) {
      return NextResponse.json(
        { error: "userId and tenantId are required" },
        { status: 400 }
      );
    }

    // Verify tenant exists
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.tenantId, tenantId))
      .limit(1);

    if (!tenant) {
      return NextResponse.json(
        { error: "Tenant not found" },
        { status: 404 }
      );
    }

    // Add user to tenant
    const [newUser] = await db
      .insert(tenantUsers)
      .values({
        userId: targetUserId,
        tenantId,
        role,
        isActive: true,
        joinedAt: new Date(),
      })
      .returning();

    logger.info("User added to tenant", {
      adminId: userId,
      newUserId: targetUserId,
      tenantId,
      role,
    });

    return NextResponse.json({
      success: true,
      data: newUser,
    });
  } catch (error) {
    logger.error("Failed to create user", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}
