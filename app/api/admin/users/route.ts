import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { getAdminUsers } from "@/actions/admin-actions";
import { db } from "@/db/db";
import { tenantUsers } from "@/db/schema/user-management-schema";
import { tenants } from "@/db/schema/tenant-management-schema";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { withSecureAPI, logApiAuditEvent } from "@/lib/middleware/api-security";
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";

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
export const GET = withEnhancedRoleAuth(90, async (request, context) => {
  const parsed = listUsersQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request parameters' }, { status: 400 });
  }

  const query = parsed.data;
  const { userId, organizationId } = context;

  const orgId = (query as Record<string, unknown>)["organizationId"] ?? (query as Record<string, unknown>)["orgId"] ?? (query as Record<string, unknown>)["organization_id"] ?? (query as Record<string, unknown>)["org_id"] ?? (query as Record<string, unknown>)["tenantId"] ?? (query as Record<string, unknown>)["tenant_id"] ?? (query as Record<string, unknown>)["unionId"] ?? (query as Record<string, unknown>)["union_id"] ?? (query as Record<string, unknown>)["localId"] ?? (query as Record<string, unknown>)["local_id"];
  if (typeof orgId === 'string' && orgId.length > 0 && orgId !== organizationId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

try {
      // Verify admin role
      const adminCheck = await db
        .select({ role: tenantUsers.role })
        .from(tenantUsers)
        .where(eq(tenantUsers.userId, userId))
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
        return NextResponse.json(
          { error: "Invalid pagination parameters" },
          { status: 400 }
        );
      }

      const users = await getAdminUsers(search, tenantId, role);

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
      return NextResponse.json(
        { error: "Failed to fetch users" },
        { status: 500 }
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

export const POST = withEnhancedRoleAuth(90, async (request, context) => {
  const parsed = z.object({}).safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request parameters' }, { status: 400 });
  }

  const query = parsed.data;
  const { userId, organizationId } = context;

  const orgId = (query as Record<string, unknown>)["organizationId"] ?? (query as Record<string, unknown>)["orgId"] ?? (query as Record<string, unknown>)["organization_id"] ?? (query as Record<string, unknown>)["org_id"] ?? (query as Record<string, unknown>)["tenantId"] ?? (query as Record<string, unknown>)["tenant_id"] ?? (query as Record<string, unknown>)["unionId"] ?? (query as Record<string, unknown>)["union_id"] ?? (query as Record<string, unknown>)["localId"] ?? (query as Record<string, unknown>)["local_id"];
  if (typeof orgId === 'string' && orgId.length > 0 && orgId !== organizationId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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

      // Verify admin role
      const adminCheck = await db
        .select({ role: tenantUsers.role })
        .from(tenantUsers)
        .where(eq(tenantUsers.userId, userId))
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
          tenantId: tenantId,
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

      return NextResponse.json({
        success: true,
        data: newUser,
      }, { status: 201 });
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
      return NextResponse.json(
        { error: "Failed to create user" },
        { status: 500 }
      );
    }
});

