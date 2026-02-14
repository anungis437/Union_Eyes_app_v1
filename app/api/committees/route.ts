/**
 * Committees API Routes
 * 
 * CRUD operations for committee entities.
 * Follows Phase 1 Security pattern with full audit logging.
 * 
 * @module app/api/committees/route
 */

import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/api-auth-guard";
import {
  createCommittee,
  listCommitteesByOrganization,
} from "@/db/queries/union-structure-queries";
import {
  createCommitteeSchema,
  committeeQuerySchema,
} from "@/lib/validation/union-structure-schemas";
import { logApiAuditEvent, SQLInjectionScanner } from "@/lib/middleware/api-security";
import { standardSuccessResponse,
} from "@/lib/api/standardized-responses";
import { logger } from "@/lib/logger";

/**
 * GET /api/committees
 * List committees by organization
 */
export const GET = async (request: NextRequest) => {
  return withAdminAuth(async (request, context) => {
    const { userId, organizationId } = context;
    const { searchParams } = new URL(request.url);

    try {
      const queryData = {
        organizationId: searchParams.get("organizationId") || organizationId,
        committeeType: searchParams.get("committeeType") || undefined,
        unitId: searchParams.get("unitId") || undefined,
        worksiteId: searchParams.get("worksiteId") || undefined,
        status: searchParams.get("status") || undefined,
        search: searchParams.get("search") || undefined,
        page: parseInt(searchParams.get("page") || "1"),
        limit: parseInt(searchParams.get("limit") || "20"),
      };

      const validation = committeeQuerySchema.safeParse(queryData);
      if (!validation.success) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: "/api/committees",
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

      const { organizationId: orgId, committeeType, status, search, page, limit } = validation.data;

      // SQL injection check
      if (orgId && SQLInjectionScanner.scanMethod(orgId)) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: "/api/committees",
          method: "GET",
          eventType: "sql_injection_attempt",
          severity: "critical",
          details: { reason: "SQL injection attempt", orgId },
        });
        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          "Invalid organization ID format"
        );
      }

      const offset = (page - 1) * limit;
      const committees = await listCommitteesByOrganization(
        orgId!,
        { committeeType, status, search, limit, offset }
      );

      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: "/api/committees",
        method: "GET",
        eventType: "success",
        severity: "low",
        details: { organizationId: orgId, count: committees.length },
      });

      return standardSuccessResponse({ committees, total: committees.length });
    } catch (error) {
      logger.error("Error listing committees", { error, userId });
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: "/api/committees",
        method: "GET",
        eventType: "validation_failed",
        severity: "high",
        details: { error: String(error) },
      });
      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        "Failed to list committees"
      );
    }
  })(request, {});
};

/**
 * POST /api/committees
 * Create new committee
 */
export const POST = async (request: NextRequest) => {
  return withAdminAuth(async (request, context) => {
    const { userId } = context;

    try {
      const body = await request.json();

      const validation = createCommitteeSchema.safeParse(body);
      if (!validation.success) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: "/api/committees",
          method: "POST",
          eventType: "validation_failed",
          severity: "medium",
          details: { errors: validation.error.errors },
        });
        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          "Invalid committee data",
          validation.error
        );
      }

      const data = validation.data;

      // SQL injection check
      if (SQLInjectionScanner.scanMethod(data.organizationId)) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: "/api/committees",
          method: "POST",
          eventType: "sql_injection_attempt",
          severity: "critical",
          details: { reason: "SQL injection attempt" },
        });
        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          "Invalid organization ID format"
        );
      }

      const committee = await createCommittee({
        ...data,
        createdBy: userId,
        updatedBy: userId,
      } as any);

      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: "/api/committees",
        method: "POST",
        eventType: "success",
        severity: "high",
        details: {
          committeeId: committee.id,
          name: committee.name,
          type: committee.committeeType,
        },
      });

      return NextResponse.json({ success: true, data: { committee }, timestamp: new Date().toISOString() }, { status: 201 });
    } catch (error) {
      logger.error("Error creating committee", { error, userId });
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: "/api/committees",
        method: "POST",
        eventType: "validation_failed",
        severity: "high",
        details: { error: String(error) },
      });
      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        "Failed to create committee"
      );
    }
  })(request, {});
};
