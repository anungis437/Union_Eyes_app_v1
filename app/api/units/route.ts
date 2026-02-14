/**
 * Bargaining Units API Routes
 * 
 * CRUD operations for bargaining unit entities.
 * Follows Phase 1 Security pattern with full audit logging.
 * 
 * @module app/api/units/route
 */

import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/api-auth-guard";
import {
  createBargainingUnit,
  listBargainingUnitsByOrganization,
  getUnitsWithExpiringContracts,
} from "@/db/queries/union-structure-queries";
import {
  createBargainingUnitSchema,
  bargainingUnitQuerySchema,
} from "@/lib/validation/union-structure-schemas";
import { logApiAuditEvent, SQLInjectionScanner } from "@/lib/middleware/api-security";
import { standardSuccessResponse,
} from "@/lib/api/standardized-responses";
import { logger } from "@/lib/logger";

/**
 * GET /api/units
 * List bargaining units by organization
 */
export const GET = async (request: NextRequest) => {
  return withAdminAuth(async (request, context) => {
    const { userId, organizationId } = context;
    const { searchParams } = new URL(request.url);

    try {
      const queryData = {
        organizationId: searchParams.get("organizationId") || organizationId,
        employerId: searchParams.get("employerId") || undefined,
        worksiteId: searchParams.get("worksiteId") || undefined,
        status: searchParams.get("status") || undefined,
        contractExpiring: searchParams.get("contractExpiring") === "true",
        search: searchParams.get("search") || undefined,
        page: parseInt(searchParams.get("page") || "1"),
        limit: parseInt(searchParams.get("limit") || "20"),
      };

      const validation = bargainingUnitQuerySchema.safeParse(queryData);
      if (!validation.success) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: "/api/units",
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

      const { organizationId: orgId, status, search, page, limit, contractExpiring } = validation.data;

      // SQL injection check
      if (orgId && SQLInjectionScanner.scanMethod(orgId)) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: "/api/units",
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

      let units;
      if (contractExpiring) {
        units = await getUnitsWithExpiringContracts(orgId!, 90);
      } else {
        const offset = (page - 1) * limit;
        units = await listBargainingUnitsByOrganization(
          orgId!,
          { status, search, limit, offset }
        );
      }

      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: "/api/units",
        method: "GET",
        eventType: "success",
        severity: "low",
        details: { organizationId: orgId, count: units.length },
      });

      return standardSuccessResponse({ units, total: units.length });
    } catch (error) {
      logger.error("Error listing units", { error, userId });
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: "/api/units",
        method: "GET",
        eventType: "validation_failed",
        severity: "high",
        details: { error: String(error) },
      });
      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        "Failed to list bargaining units"
      );
    }
  })(request, {});
};

/**
 * POST /api/units
 * Create new bargaining unit
 */
export const POST = async (request: NextRequest) => {
  return withAdminAuth(async (request, context) => {
    const { userId } = context;

    try {
      const body = await request.json();

      const validation = createBargainingUnitSchema.safeParse(body);
      if (!validation.success) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: "/api/units",
          method: "POST",
          eventType: "validation_failed",
          severity: "medium",
          details: { errors: validation.error.errors },
        });
        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          "Invalid bargaining unit data",
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
          endpoint: "/api/units",
          method: "POST",
          eventType: "sql_injection_attempt",
          severity: "critical",
          details: { reason: "SQL injection attempt" },
        });
        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          "Invalid ID format"
        );
      }

      const unit = await createBargainingUnit({
        ...data,
        createdBy: userId,
        updatedBy: userId,
      });

      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: "/api/units",
        method: "POST",
        eventType: "success",
        severity: "high",
        details: {
          unitId: unit.id,
          name: unit.name,
          organizationId: unit.organizationId,
        },
      });

      return NextResponse.json({ success: true, data: { unit }, timestamp: new Date().toISOString() }, { status: 201 });
    } catch (error) {
      logger.error("Error creating bargaining unit", { error, userId });
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: "/api/units",
        method: "POST",
        eventType: "validation_failed",
        severity: "high",
        details: { error: String(error) },
      });
      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        "Failed to create bargaining unit"
      );
    }
  })(request, {});
};
