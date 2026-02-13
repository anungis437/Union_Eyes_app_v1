/**
 * Employers API Routes
 * 
 * CRUD operations for employer entities (companies members work for).
 * Follows Phase 1 Security pattern with full audit logging.
 * 
 * Security Features:
 * - Role-based access control (admin level)
 * - SQL injection prevention
 * - Input validation via Zod
 * - Comprehensive audit logging
 * - RLS enforcement
 * 
 * @module app/api/employers/route
 */

import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/api-auth-guard";
import {
  createEmployer,
  listEmployersByOrganization,
} from "@/db/queries/union-structure-queries";
import {
  createEmployerSchema,
  employerQuerySchema,
} from "@/lib/validation/union-structure-schemas";
import { logApiAuditEvent, SQLInjectionScanner } from "@/lib/middleware/api-security";
import {
  standardErrorResponse,
  standardSuccessResponse,
  ErrorCode,
} from "@/lib/api/standardized-responses";
import { logger } from "@/lib/logger";

/**
 * GET /api/employers
 * List employers by organization with filtering
 */
export const GET = async (request: NextRequest) => {
  return withAdminAuth(async (request, context) => {
    const { userId, organizationId } = context;
    const { searchParams } = new URL(request.url);

    try {
      // Parse and validate query parameters
      const queryData = {
        organizationId: searchParams.get("organizationId") || organizationId,
        status: searchParams.get("status") || undefined,
        employerType: searchParams.get("employerType") || undefined,
        search: searchParams.get("search") || undefined,
        page: parseInt(searchParams.get("page") || "1"),
        limit: parseInt(searchParams.get("limit") || "20"),
      };

      const validation = employerQuerySchema.safeParse(queryData);
      if (!validation.success) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: "/api/employers",
          method: "GET",
          eventType: "validation_failed",
          severity: "medium",
          details: { errors: validation.error.errors },
        });
        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          "Invalid query parameters",
          validation.error
        );
      }

      const { organizationId: orgId, status, employerType, search, page, limit } = validation.data;

      // SQL injection check on organizationId
      if (orgId && SQLInjectionScanner.scanMethod(orgId)) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: "/api/employers",
          method: "GET",
          eventType: "sql_injection_attempt",
          severity: "critical",
          details: { reason: "SQL injection attempt in organizationId", orgId },
        });
        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          "Invalid organization ID format"
        );
      }

      const offset = (page - 1) * limit;
      const employers = await listEmployersByOrganization(
        orgId!,
        { status, search, limit, offset }
      );

      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: "/api/employers",
        method: "GET",
        eventType: "success",
        severity: "low",
        details: { organizationId: orgId, count: employers.length },
      });

      return standardSuccessResponse({ employers, total: employers.length });
    } catch (error) {
      logger.error("Error listing employers", { error, userId });
      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        "Failed to list employers"
      );
    }
  })(request, {});
};

/**
 * POST /api/employers
 * Create new employer
 */
export const POST = async (request: NextRequest) => {
  return withAdminAuth(async (request, context) => {
    const { userId, organizationId } = context;

    try {
      const body = await request.json();

      // Validate input
      const validation = createEmployerSchema.safeParse(body);
      if (!validation.success) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: "/api/employers",
          method: "POST",
          eventType: "validation_failed",
          severity: "medium",
          details: { errors: validation.error.errors },
        });
        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          "Invalid employer data",
          validation.error
        );
      }

      const data = validation.data;

      // SQL injection check on organizationId
      if (SQLInjectionScanner.scanMethod(data.organizationId)) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: "/api/employers",
          method: "POST",
          eventType: "sql_injection_attempt",
          severity: "critical",
          details: { reason: "SQL injection attempt in organizationId" },
        });
        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          "Invalid organization ID format"
        );
      }

      // Create employer
      const employer = await createEmployer({
        ...data,
        createdBy: userId,
        updatedBy: userId,
      } as any);

      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: "/api/employers",
        method: "POST",
        eventType: "success",
        severity: "low",
        details: {
          employerId: employer.id,
          name: employer.name,
          organizationId: employer.organizationId,
        },
      });

      return NextResponse.json(
        { success: true, data: { employer }, timestamp: new Date().toISOString() },
        { status: 201 }
      );
    } catch (error) {
      logger.error("Error creating employer", { error, userId });
      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        "Failed to create employer"
      );
    }
  })(request, {});
};
