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
import { organizationUsers } from "@/db/schema/domains/member";
import { eq, and } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { withEnhancedRoleAuth } from "@/lib/api-auth-guard";

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
export const GET = async (request: NextRequest, { params }: { params: { userId: string } }) => {
  return withEnhancedRoleAuth(90, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      const targetUserId = params.userId;

      // All database operations wrapped in withRLSContext - RLS policies handle tenant isolation
      return withRLSContext(async (tx) => {
        // Check admin role
        const adminCheck = await tx
          .select({ role: organizationUsers.role })
          .from(organizationUsers)
          .where(eq(organizationUsers.userId, userId))
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
          .from(organizationUsers)
          .where(eq(organizationUsers.userId, targetUserId));

        if (userDetails.length === 0) {
          return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'User not found'
    );
        }

        return NextResponse.json({
          success: true,
          data: userDetails,
        });
      });
    } catch (error) {
      logger.error("Failed to fetch user details", error);
      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch user details',
      error
    );
    }
    })(request, { params });
};


const adminUsersSchema = z.object({
  organizationId: z.string().uuid('Invalid organizationId'),
  tenantId: z.string().uuid('Invalid tenantId'),
  action: z.unknown().optional(),
  role: z.unknown().optional(),
});

export const PUT = async (request: NextRequest, { params }: { params: { userId: string } }) => {
  return withEnhancedRoleAuth(90, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      const targetUserId = params.userId;
      const body = await request.json();
    // Validate request body
    const validation = adminUsersSchema.safeParse(body);
    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request data',
        validation.error.errors
      );
    }
    
    const { organizationId, tenantId, action, role } = validation.data;
      const { organizationId: organizationIdFromBody, tenantId: tenantIdFromBody, action, role } = body;
      const requestedOrganizationId = organizationIdFromBody ?? tenantIdFromBody;
      const tenantId = requestedOrganizationId;

      if (!requestedOrganizationId) {
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'organizationId is required'
    );
      }

      // Check admin role using RLS-protected query
      return withRLSContext(async (tx) => {
        const adminCheck = await tx
          .select({ role: organizationUsers.role })
          .from(organizationUsers)
          .where(eq(organizationUsers.userId, userId))
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
          return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid action'
    );
        }
      });
    } catch (error) {
      logger.error("Failed to update user", error);
      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to update user',
      error
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
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'organizationId is required'
    );
      }

      // Check admin role and execute deletion using RLS-protected query
      return withRLSContext(async (tx) => {
        const adminCheck = await tx
          .select({ role: organizationUsers.role })
          .from(organizationUsers)
          .where(eq(organizationUsers.userId, userId))
          .limit(1);

        if (adminCheck.length === 0 || adminCheck[0].role !== "admin") {
          return NextResponse.json(
            { error: "Admin access required" },
            { status: 403 }
          );
        }

        await deleteUserFromTenant(targetUserId, tenantId);

        return NextResponse.json({
          success: true,
          message: "User removed from tenant",
        });
      }, organizationId);
    } catch (error) {
      logger.error("Failed to delete user", error);
      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to delete user',
      error
    );
    }
    })(request, { params });
};
