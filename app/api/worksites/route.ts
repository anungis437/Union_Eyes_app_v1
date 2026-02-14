/**
 * Worksites API Routes
 * 
 * CRUD operations for worksite entities (physical work locations).
 * Follows Phase 1 Security pattern with full audit logging.
 * 
 * @module app/api/worksites/route
 */

import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/api-auth-guard";
import {
  createWorksite,
  listWorksitesByEmployer,
} from "@/db/queries/union-structure-queries";
import {
  createWorksiteSchema,
  worksiteQuerySchema,
} from "@/lib/validation/union-structure-schemas";
import { logApiAuditEvent, SQLInjectionScanner } from "@/lib/middleware/api-security";
import { standardSuccessResponse,
} from "@/lib/api/standardized-responses";
import { logger } from "@/lib/logger";

/**
 * GET /api/worksites
 * List worksites by employer or organization
 */
export const GET = async (request: NextRequest) => {
  return withAdminAuth(async (request, context) => {
    const { userId } = context;
    const { searchParams } = new URL(request.url);

    try {
      const queryData = {
        organizationId: searchParams.get("organizationId") || undefined,
        employerId: searchParams.get("employerId") || undefined,
        status: searchParams.get("status") || undefined,
        search: searchParams.get("search") || undefined,
        page: parseInt(searchParams.get("page") || "1"),
        limit: parseInt(searchParams.get("limit") || "20"),
      };

      const validation = worksiteQuerySchema.safeParse(queryData);
      if (!validation.success) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: "/api/worksites",
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

      const { employerId, status, search, page, limit } = validation.data;

      if (!employerId) {
        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          "employerId is required"
        );
      }

      // SQL injection check
      if (SQLInjectionScanner.scanMethod(employerId)) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: "/api/worksites",
          method: "GET",
          eventType: "sql_injection_attempt",
          severity: "critical",
          details: { reason: "SQL injection attempt in employerId", employerId },
        });
        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          "Invalid employer ID format"
        );
      }

      const offset = (page - 1) * limit;
      const worksites = await listWorksitesByEmployer(
        employerId,
        { status, search, limit, offset }
      );

      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: "/api/worksites",
        method: "GET",
        eventType: "success",
        severity: "low",
        details: { employerId, count: worksites.length },
      });

      return standardSuccessResponse({ worksites, total: worksites.length });
    } catch (error) {
      logger.error("Error listing worksites", { error, userId });
      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        "Failed to list worksites"
      );
    }
  })(request, {});
};

/**
 * POST /api/worksites
 * Create new worksite
 */
export const POST = async (request: NextRequest) => {
  return withAdminAuth(async (request, context) => {
    const { userId } = context;

    try {
      const body = await request.json();

      const validation = createWorksiteSchema.safeParse(body);
      if (!validation.success) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: "/api/worksites",
          method: "POST",
          eventType: "validation_failed",
          severity: "medium",
          details: { errors: validation.error.errors },
        });
        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          "Invalid worksite data",
          validation.error
        );
      }

      const data = validation.data;

      // SQL injection checks
      if (SQLInjectionScanner.scanMethod(data.organizationId) ||
          SQLInjectionScanner.scanMethod(data.employerId)) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: "/api/worksites",
          method: "POST",
          eventType: "sql_injection_attempt",
          severity: "critical",
          details: { reason: "SQL injection attempt in IDs" },
        });
        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          "Invalid ID format"
        );
      }

      const worksite = await createWorksite({
        ...data,
        createdBy: userId,
        updatedBy: userId,
      });

      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: "/api/worksites",
        method: "POST",
        eventType: "success",
        severity: "low",
        details: {
          worksiteId: worksite.id,
          name: worksite.name,
          employerId: worksite.employerId,
        },
      });

      return NextResponse.json(
        { success: true, data: { worksite }, timestamp: new Date().toISOString() },
        { status: 201 }
      );
    } catch (error) {
      logger.error("Error creating worksite", { error, userId });
      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        "Failed to create worksite"
      );
    }
  })(request, {});
};
