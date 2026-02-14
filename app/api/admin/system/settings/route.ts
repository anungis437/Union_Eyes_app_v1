/**
 * System Settings API
 * 
 * MIGRATION STATUS: ✅ Migrated to use withRLSContext()
 * - All database operations wrapped in withRLSContext() for automatic context setting
 * - RLS policies enforce organization isolation at database level
 */

import { NextRequest, NextResponse } from "next/server";
import { withRLSContext } from '@/lib/db/with-rls-context';
import { organizationUsers } from "@/db/schema/domains/member";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { getSystemConfigs, updateSystemConfig } from "@/actions/admin-actions";
import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { withApiAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { checkRateLimit, RATE_LIMITS, createRateLimitHeaders } from "@/lib/rate-limiter";

import { standardSuccessResponse } from '@/lib/api/standardized-responses';
/**
 * Validation schemas
 */
const getSettingsSchema = z.object({
  category: z.string().optional(),
});

const updateSettingsSchema = z.object({
  organizationId: z.string().uuid(),
  category: z.string().min(1),
  key: z.string().min(1),
  value: z.unknown(),
});

/**
 * Helper to check admin role using RLS-protected query
 */
async function checkAdminRole(userId: string): Promise<boolean> {
  try {
    return withRLSContext(async (tx) => {
      const admin = await tx
        .select({ role: organizationUsers.role })
        .from(organizationUsers)
        .where(eq(organizationUsers.userId, userId))
        .limit(1);
      return admin.length > 0 && admin[0].role === "admin";
    });
  } catch (_error) {
    return false;
  }
}

/**
 * GET /api/admin/system/settings
 * Get system configurations
 */
export const GET = withRoleAuth(90, async (request, context) => {
  const parsed = getSettingsSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) {
    return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid request parameters',
      error
    );
  }

  const query = parsed.data;
  const { userId, organizationId } = context;

  // Rate limiting for system operations
  const rateLimitResult = await checkRateLimit(
    `system-ops:${userId}`,
    RATE_LIMITS.SYSTEM_OPERATIONS
  );

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded", resetIn: rateLimitResult.resetIn },
      {
        status: 429,
        headers: createRateLimitHeaders(rateLimitResult),
      }
    );
  }

  const orgId = (query as Record<string, unknown>)["organizationId"] ?? (query as Record<string, unknown>)["orgId"] ?? (query as Record<string, unknown>)["organization_id"] ?? (query as Record<string, unknown>)["org_id"] ?? (query as Record<string, unknown>)["unionId"] ?? (query as Record<string, unknown>)["union_id"] ?? (query as Record<string, unknown>)["localId"] ?? (query as Record<string, unknown>)["local_id"];
  if (typeof orgId === 'string' && orgId.length > 0 && orgId !== organizationId) {
    return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Forbidden',
      error
    );
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
      const configs = await getSystemConfigs(tx, category);

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
      }, {
        headers: createRateLimitHeaders(rateLimitResult),
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
export const PUT = withRoleAuth(90, async (request, context) => {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid JSON in request body',
      error
    );
  }

  const parsed = updateSettingsSchema.safeParse(rawBody);
  if (!parsed.success) {
    return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid request body',
      error
    );
  }

  const body = parsed.data;
  const { userId, organizationId } = context;

  // Rate limiting for system operations
  const rateLimitResult = await checkRateLimit(
    `system-ops:${userId}`,
    RATE_LIMITS.SYSTEM_OPERATIONS
  );

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded", resetIn: rateLimitResult.resetIn },
      {
        status: 429,
        headers: createRateLimitHeaders(rateLimitResult),
      }
    );
  }

  const orgId = (body as Record<string, unknown>)["organizationId"] ?? (body as Record<string, unknown>)["orgId"] ?? (body as Record<string, unknown>)["organization_id"] ?? (body as Record<string, unknown>)["org_id"] ?? (body as Record<string, unknown>)["unionId"] ?? (body as Record<string, unknown>)["union_id"] ?? (body as Record<string, unknown>)["localId"] ?? (body as Record<string, unknown>)["local_id"];
  if (typeof orgId === 'string' && orgId.length > 0 && orgId !== organizationId) {
    return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Forbidden',
      error
    );
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

      const { organizationId: organizationIdFromBody, category, key, value } = body;
      const organizationId = organizationIdFromBody;

      await updateSystemConfig(tx, organizationId, category, key, value);

      logApiAuditEvent({
        timestamp: new Date().toISOString(), userId,
        endpoint: '/api/admin/system/settings',
        method: 'PUT',
        eventType: 'success',
        severity: 'high',
        details: {
          adminId: userId,
          organizationId,
          category,
          key,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Setting updated successfully",
      }, {
        headers: createRateLimitHeaders(rateLimitResult),
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


