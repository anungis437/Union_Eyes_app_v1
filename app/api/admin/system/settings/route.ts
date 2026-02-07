import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import { tenantUsers } from "@/db/schema/user-management-schema";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { getSystemConfigs, updateSystemConfig } from "@/actions/admin-actions";
import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";

/**
 * Validation schemas
 */
const getSettingsSchema = z.object({
  category: z.string().optional(),
});

const updateSettingsSchema = z.object({
  tenantId: z.string().uuid(),
  category: z.string().min(1),
  key: z.string().min(1),
  value: z.unknown(),
});

/**
 * Helper to check admin role
 */
async function checkAdminRole(userId: string): Promise<boolean> {
  try {
    const admin = await db
      .select({ role: tenantUsers.role })
      .from(tenantUsers)
      .where(eq(tenantUsers.userId, userId))
      .limit(1);
    return admin.length > 0 && admin[0].role === "admin";
  } catch (_error) {
    return false;
  }
}

/**
 * GET /api/admin/system/settings
 * Get system configurations
 */
export const GET = withEnhancedRoleAuth(90, async (request, context) => {
  const parsed = getSettingsSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
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
      // Check admin role
      const isAdmin = await checkAdminRole(userId);
      if (!isAdmin) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(), userId,
          endpoint: '/api/admin/system/settings',
          method: 'GET',
          eventType: 'unauthorized_access',
          severity: 'high',
          details: { reason: 'Non-admin attempted to access system settings' },
        });
        return NextResponse.json(
          { error: "Admin access required" },
          { status: 403 }
        );
      }

      const category = query.category || undefined;
      const configs = await getSystemConfigs(category);

      logApiAuditEvent({
        timestamp: new Date().toISOString(), userId,
        endpoint: '/api/admin/system/settings',
        method: 'GET',
        eventType: 'success',
        severity: 'high',
        details: { category, configCount: configs.length },
      });

      return NextResponse.json({
        success: true,
        data: configs,
        count: configs.length,
      });
    } catch (error) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(), userId,
        endpoint: '/api/admin/system/settings',
        method: 'GET',
        eventType: 'auth_failed',
        severity: 'high',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      });

      logger.error("Failed to fetch system settings", error);
      throw error;
    }
});

/**
 * PUT /api/admin/system/settings
 * Update system configuration
 */
export const PUT = withEnhancedRoleAuth(90, async (request, context) => {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
  }

  const parsed = updateSettingsSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const body = parsed.data;
  const { userId, organizationId } = context;

  const orgId = (body as Record<string, unknown>)["organizationId"] ?? (body as Record<string, unknown>)["orgId"] ?? (body as Record<string, unknown>)["organization_id"] ?? (body as Record<string, unknown>)["org_id"] ?? (body as Record<string, unknown>)["tenantId"] ?? (body as Record<string, unknown>)["tenant_id"] ?? (body as Record<string, unknown>)["unionId"] ?? (body as Record<string, unknown>)["union_id"] ?? (body as Record<string, unknown>)["localId"] ?? (body as Record<string, unknown>)["local_id"];
  if (typeof orgId === 'string' && orgId.length > 0 && orgId !== organizationId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

try {
      // Check admin role
      const isAdmin = await checkAdminRole(userId);
      if (!isAdmin) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(), userId,
          endpoint: '/api/admin/system/settings',
          method: 'PUT',
          eventType: 'unauthorized_access',
          severity: 'high',
          details: { reason: 'Non-admin attempted to update system settings' },
        });
        return NextResponse.json(
          { error: "Admin access required" },
          { status: 403 }
        );
      }

      const { tenantId, category, key, value } = body;

      await updateSystemConfig(tenantId, category, key, value);

      logApiAuditEvent({
        timestamp: new Date().toISOString(), userId,
        endpoint: '/api/admin/system/settings',
        method: 'PUT',
        eventType: 'success',
        severity: 'high',
        details: {
          adminId: userId,
          tenantId,
          category,
          key,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Setting updated successfully",
      });
    } catch (error) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(), userId,
        endpoint: '/api/admin/system/settings',
        method: 'PUT',
        eventType: 'auth_failed',
        severity: 'high',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      });

      logger.error("Failed to update system setting", error);
      throw error;
    }
});

