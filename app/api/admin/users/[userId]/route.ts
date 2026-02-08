/**
 * Admin Individual User API
 * 
 * MIGRATION STATUS: ✅ Migrated to use withRLSContext()
 * - All database operations wrapped in withRLSContext() for automatic context setting
 * - RLS policies enforce tenant isolation at database level
 */

import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { NextRequest, NextResponse } from "next/server";
import { 
  updateUserRole, 
  toggleUserStatus, 
  deleteUserFromTenant 
} from "@/actions/admin-actions";
import { withRLSContext } from '@/lib/db/with-rls-context';
import { tenantUsers } from "@/db/schema/user-management-schema";
import { eq, and } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";

export const GET = async (request: NextRequest, { params }: { params: { userId: string } }) => {
  return withEnhancedRoleAuth(90, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      const targetUserId = params.userId;

      // All database operations wrapped in withRLSContext - RLS policies handle tenant isolation
      return withRLSContext(async (tx) => {
        // Check admin role
        const adminCheck = await tx
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

        // Get user details across all tenants
        const userDetails = await tx
          .select()
          .from(tenantUsers)
          .where(eq(tenantUsers.userId, targetUserId));

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
      });
    } catch (error) {
      logger.error("Failed to fetch user details", error);
      return NextResponse.json(
        { error: "Failed to fetch user details" },
        { status: 500 }
      );
    }
    })(request, { params });
};

export const PUT = async (request: NextRequest, { params }: { params: { userId: string } }) => {
  return withEnhancedRoleAuth(90, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      const targetUserId = params.userId;
      const body = await request.json();
      const { organizationId: organizationIdFromBody, tenantId: tenantIdFromBody, action, role } = body;
      const requestedOrganizationId = organizationIdFromBody ?? tenantIdFromBody;
      const tenantId = requestedOrganizationId;

      if (!requestedOrganizationId) {
        return NextResponse.json(
          { error: "organizationId is required" },
          { status: 400 }
        );
      }

      // Check admin role using RLS-protected query
      return withRLSContext(async (tx) => {
        const adminCheck = await tx
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

        // Execute action
        if (action === "updateRole" && role) {
          await updateUserRole(tx, targetUserId, tenantId, role);
          return NextResponse.json({
            success: true,
            message: "User role updated",
          });
        } else if (action === "toggleStatus") {
          await toggleUserStatus(tx, targetUserId, tenantId);
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
      });
    } catch (error) {
      logger.error("Failed to update user", error);
      return NextResponse.json(
        { error: "Failed to update user" },
        { status: 500 }
      );
    }
    })(request, { params });
};

export const DELETE = async (request: NextRequest, { params }: { params: { userId: string } }) => {
  return withEnhancedRoleAuth(90, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      const targetUserId = params.userId;
      const searchParams = request.nextUrl.searchParams;
      const requestedOrganizationId = (searchParams.get("organizationId") ?? searchParams.get("tenantId"));
      const tenantId = requestedOrganizationId;

      if (!requestedOrganizationId) {
        return NextResponse.json(
          { error: "organizationId is required" },
          { status: 400 }
        );
      }

      // Check admin role and execute deletion using RLS-protected query
      return withRLSContext(async (tx) => {
        const adminCheck = await tx
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
    })(request, { params });
};
