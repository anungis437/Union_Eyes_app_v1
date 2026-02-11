/**
 * Admin Users Management API
 * 
 * MIGRATION STATUS: ✅ Migrated to use withRLSContext()
 * - All database operations wrapped in withRLSContext() for automatic context setting
 * - RLS policies enforce tenant isolation at database level
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUsers } from "@/actions/admin-actions";
import { withRLSContext } from '@/lib/db/with-rls-context';
import { organizationUsers } from "@/db/schema/domains/member";
import { tenants } from "@/db/schema/tenant-management-schema";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { withSecureAPI, logApiAuditEvent } from "@/lib/middleware/api-security";
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
/**
 * Validation schemas for admin users API
 */
const listUsersQuerySchema = z.object({
  search: z.string().optional(),
  tenantId: z.string().uuid().optional(),
  role: z.enum(["admin", "officer", "member", "viewer"]).optional(),
  page: z.string().default("1").transform(v => parseInt(v)),
  limit: z.string().default("20").transform(v => parseInt(v)),
});

/**
 * GET /api/admin/users
 * List all users with filtering
 * Security: Admin role required + validated query parameters
 */
export const GET = withRoleAuth('admin', async (request, context) => {
  const parsed = listUsersQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) {
    return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid request parameters'
    );
  }

  const query = parsed.data;
  const { userId, organizationId } = context;

  const orgId = (query as Record<string, unknown>)["organizationId"] ?? (query as Record<string, unknown>)["orgId"] ?? (query as Record<string, unknown>)["organization_id"] ?? (query as Record<string, unknown>)["org_id"] ?? (query as Record<string, unknown>)["tenantId"] ?? (query as Record<string, unknown>)["tenant_id"] ?? (query as Record<string, unknown>)["unionId"] ?? (query as Record<string, unknown>)["union_id"] ?? (query as Record<string, unknown>)["localId"] ?? (query as Record<string, unknown>)["local_id"];
  if (typeof orgId === 'string' && orgId.length > 0 && orgId !== organizationId) {
    return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Forbidden'
    );
  }

try {
      // All database operations wrapped in withRLSContext - RLS policies handle tenant isolation
      return withRLSContext(async (tx) => {
        // Verify admin role
        const adminCheck = await tx
          .select({ role: organizationUsers.role })
          .from(organizationUsers)
          .where(eq(organizationUsers.userId, userId))
          .limit(1);

        if (adminCheck.length === 0 || adminCheck[0].role !== "admin") {
          logApiAuditEvent({
            timestamp: new Date().toISOString(), userId,
            endpoint: "/api/admin/users",
            method: "GET",
            eventType: "unauthorized_access",
            severity: "high",
            details: { reason: "Non-admin attempted access", actualRole: adminCheck[0]?.role },
          });

          return NextResponse.json(
            { error: "Admin access required" },
            { status: 403 }
          );
        }

        const { search, tenantId, role, page, limit } = query;

        // Validate pagination
        if (page < 1 || limit < 1 || limit > 100) {
          return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid pagination parameters'
    );
        }

        const users = await getAdminUsers(tx, search, tenantId, role);

        logApiAuditEvent({
          timestamp: new Date().toISOString(), userId,
          endpoint: "/api/admin/users",
          method: "GET",
          eventType: "success",
          severity: "low",
          details: { 
            resultCount: users.length,
            filters: { search, tenantId, role },
          },
        });

        return NextResponse.json({
          success: true,
          data: users,
          count: users.length,
        });
      });
    } catch (error) {
      logger.error("Failed to fetch users", error);
      logApiAuditEvent({
        timestamp: new Date().toISOString(), userId,
        endpoint: "/api/admin/users",
        method: "GET",
        eventType: "auth_failed",
        severity: "high",
        details: { error: error instanceof Error ? error.message : "Unknown error" },
      });
      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch users',
      error
    );
    }
});

/**
 * POST /api/admin/users
 * Create new user or add user to tenant
 * Security: Admin role required + validated input
 */

const createUserSchema = z.object({
  userId: z.string().uuid(),
  tenantId: z.string().uuid(),
  role: z.enum(["admin", "officer", "member", "viewer"]).default("member"),
});

export const POST = withRoleAuth('admin', async (request, context) => {
  const parsed = z.object({}).safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) {
    return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid request parameters',
      error
    );
  }

  const query = parsed.data;
  const { userId, organizationId } = context;

  const orgId = (query as Record<string, unknown>)["organizationId"] ?? (query as Record<string, unknown>)["orgId"] ?? (query as Record<string, unknown>)["organization_id"] ?? (query as Record<string, unknown>)["org_id"] ?? (query as Record<string, unknown>)["tenantId"] ?? (query as Record<string, unknown>)["tenant_id"] ?? (query as Record<string, unknown>)["unionId"] ?? (query as Record<string, unknown>)["union_id"] ?? (query as Record<string, unknown>)["localId"] ?? (query as Record<string, unknown>)["local_id"];
  if (typeof orgId === 'string' && orgId.length > 0 && orgId !== organizationId) {
    return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Forbidden',
      error
    );
  }

try {
      // Parse body separately since POST doesn't use query
      const body = await request.json();
      
      // Validate body
      const bodyResult = createUserSchema.safeParse(body);
      if (!bodyResult.success) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(), userId,
          endpoint: "/api/admin/users",
          method: "POST",
          eventType: "validation_failed",
          severity: "medium",
          details: { errors: bodyResult.error.flatten().fieldErrors },
        });

        return NextResponse.json(
          { error: "Invalid request body", details: bodyResult.error.flatten().fieldErrors },
          { status: 400 }
        );
      }

      const { userId: targetUserId, tenantId, role } = bodyResult.data;

      // All database operations wrapped in withRLSContext - RLS policies handle tenant isolation
      return withRLSContext(async (tx) => {
        // Verify admin role
        const adminCheck = await tx
          .select({ role: organizationUsers.role })
          .from(organizationUsers)
          .where(eq(organizationUsers.userId, userId))
          .limit(1);

        if (adminCheck.length === 0 || adminCheck[0].role !== "admin") {
          logApiAuditEvent({
            timestamp: new Date().toISOString(), userId,
            endpoint: "/api/admin/users",
            method: "POST",
            eventType: "unauthorized_access",
            severity: "high",
            details: { reason: "Non-admin attempted user creation" },
          });

          return NextResponse.json(
            { error: "Admin access required" },
            { status: 403 }
          );
        }

        // Verify tenant exists
        const [tenant] = await tx
          .select()
          .from(tenants)
          .where(eq(tenants.tenantId, tenantId))
          .limit(1);

        if (!tenant) {
          return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Tenant not found'
    );
        }

        // Add user to tenant
        const [newUser] = await tx
          .insert(organizationUsers)
          .values({
            userId: targetUserId,
            organizationId: tenantId,
            role,
            isActive: true,
            joinedAt: new Date(),
          })
          .returning();

        logApiAuditEvent({
          timestamp: new Date().toISOString(), userId,
          endpoint: "/api/admin/users",
          method: "POST",
          eventType: "success",
          severity: "medium",
          details: {
            adminId: userId,
            newUserId: targetUserId,
            tenantId,
            role,
          },
        });

        logger.info("User added to tenant", {
          adminId: userId,
          newUserId: targetUserId,
          tenantId,
          role,
        });

        return standardSuccessResponse(
      { data: newUser, },
      undefined,
      201
    );
      });
    } catch (error) {
      logger.error("Failed to create user", error);
      logApiAuditEvent({
        timestamp: new Date().toISOString(), userId,
        endpoint: "/api/admin/users",
        method: "POST",
        eventType: "auth_failed",
        severity: "high",
        details: { error: error instanceof Error ? error.message : "Unknown error" },
      });
      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to create user',
      error
    );
    }
});


