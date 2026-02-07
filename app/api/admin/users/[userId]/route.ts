import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { NextRequest, NextResponse } from "next/server";
import { 
  updateUserRole, 
  toggleUserStatus, 
  deleteUserFromTenant 
} from "@/actions/admin-actions";
import { db } from "@/db/db";
import { tenantUsers } from "@/db/schema/user-management-schema";
import { eq, and } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";

export const GET = async (request: NextRequest, { params }: { params: { userId: string } }) => {
  return withEnhancedRoleAuth(90, async (request, context) => {
    const user = { id: context.userId, organizationId: context.organizationId };

  try {
      // Check admin role
      const adminCheck = await db
        .select({ role: tenantUsers.role })
        .from(tenantUsers)
        .where(eq(tenantUsers.user.id, user.id))
        .limit(1);

      if (adminCheck.length === 0 || adminCheck[0].role !== "admin") {
        return NextResponse.json(
          { error: "Admin access required" },
          { status: 403 }
        );
      }

      const targetUserId = params.user.id;

      // Get user details across all tenants
      const userDetails = await db
        .select()
        .from(tenantUsers)
        .where(eq(tenantUsers.user.id, targetUserId));

      if (userDetails.length === 0) {
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: userDetails,
      });
    } catch (error) {
      logger.error("Failed to fetch user details", error);
      return NextResponse.json(
        { error: "Failed to fetch user details" },
        { status: 500 }
      );
    }
  })
  })(request, { params });
};

export const PUT = async (request: NextRequest, { params }: { params: { userId: string } }) => {
  return withEnhancedRoleAuth(90, async (request, context) => {
    const user = { id: context.userId, organizationId: context.organizationId };

  try {
      // Check admin role
      const adminCheck = await db
        .select({ role: tenantUsers.role })
        .from(tenantUsers)
        .where(eq(tenantUsers.user.id, user.id))
        .limit(1);

      if (adminCheck.length === 0 || adminCheck[0].role !== "admin") {
        return NextResponse.json(
          { error: "Admin access required" },
          { status: 403 }
        );
      }

      const targetUserId = params.user.id;
      const body = await request.json();
      const { tenantId, action, role } = body;

      if (!tenantId) {
        return NextResponse.json(
          { error: "tenantId is required" },
          { status: 400 }
        );
      }

      // Execute action
      if (action === "updateRole" && role) {
        await updateUserRole(targetUserId, tenantId, role);
        return NextResponse.json({
          success: true,
          message: "User role updated",
        });
      } else if (action === "toggleStatus") {
        await toggleUserStatus(targetUserId, tenantId);
        return NextResponse.json({
          success: true,
          message: "User status toggled",
        });
      } else {
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
      }
    } catch (error) {
      logger.error("Failed to update user", error);
      return NextResponse.json(
        { error: "Failed to update user" },
        { status: 500 }
      );
    }
  })
  })(request, { params });
};

export const DELETE = async (request: NextRequest, { params }: { params: { userId: string } }) => {
  return withEnhancedRoleAuth(90, async (request, context) => {
    const user = { id: context.userId, organizationId: context.organizationId };

  try {
      // Check admin role
      const adminCheck = await db
        .select({ role: tenantUsers.role })
        .from(tenantUsers)
        .where(eq(tenantUsers.user.id, user.id))
        .limit(1);

      if (adminCheck.length === 0 || adminCheck[0].role !== "admin") {
        return NextResponse.json(
          { error: "Admin access required" },
          { status: 403 }
        );
      }

      const targetUserId = params.user.id;
      const searchParams = request.nextUrl.searchParams;
      const tenantId = searchParams.get("tenantId");

      if (!tenantId) {
        return NextResponse.json(
          { error: "tenantId is required" },
          { status: 400 }
        );
      }

      await deleteUserFromTenant(targetUserId, tenantId);

      return NextResponse.json({
        success: true,
        message: "User removed from tenant",
      });
    } catch (error) {
      logger.error("Failed to delete user", error);
      return NextResponse.json(
        { error: "Failed to delete user" },
        { status: 500 }
      );
    }
  })
  })(request, { params });
};
