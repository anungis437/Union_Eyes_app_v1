/**
 * Bargaining Unit Detail API Routes
 * 
 * Get, update, or archive specific bargaining unit by ID.
 * 
 * @module app/api/units/[id]/route
 */

import { NextRequest } from "next/server";
import { withAdminAuth } from "@/lib/api-auth-guard";
import {
  getBargainingUnitById,
  updateBargainingUnit,
  archiveBargainingUnit,
} from "@/db/queries/union-structure-queries";
import { updateBargainingUnitSchema } from "@/lib/validation/union-structure-schemas";
import { logApiAuditEvent, SQLInjectionScanner } from "@/lib/middleware/api-security";
import {
  standardErrorResponse,
  standardSuccessResponse,
  ErrorCode,
} from "@/lib/api/standardized-responses";
import { logger } from "@/lib/logger";

type RouteParams = {
  params: {
    id: string;
  };
};

/**
 * GET /api/units/[id]
 */
export const GET = async (request: NextRequest, { params }: RouteParams) => {
  return withAdminAuth(async (request, context) => {
    const { userId } = context;
    const { id } = params;

    try {
      if (SQLInjectionScanner.scanMethod(id)) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: `/api/units/${id}`,
          method: "GET",
          eventType: "sql_injection_attempt",
          severity: "critical",
          details: { reason: "SQL injection attempt", id },
        });
        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          "Invalid unit ID format"
        );
      }

      const unit = await getBargainingUnitById(id);

      if (!unit) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: `/api/units/${id}`,
          method: "GET",
          eventType: "validation_failed",
          severity: "medium",
          details: { unitId: id },
        });
        return standardErrorResponse(
          ErrorCode.RESOURCE_NOT_FOUND,
          "Bargaining unit not found"
        );
      }

      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: `/api/units/${id}`,
        method: "GET",
        eventType: "success",
        severity: "low",
        details: { unitId: id, name: unit.name },
      });

      return standardSuccessResponse({ unit });
    } catch (error) {
      logger.error("Error fetching unit", { error, userId, id });
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: `/api/units/${id}`,
        method: "GET",
        eventType: "validation_failed",
        severity: "high",
        details: { error: String(error), unitId: id },
      });
      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        "Failed to fetch bargaining unit"
      );
    }
  })(request, { params });
};

/**
 * PUT /api/units/[id]
 */
export const PUT = async (request: NextRequest, { params }: RouteParams) => {
  return withAdminAuth(async (request, context) => {
    const { userId } = context;
    const { id } = params;

    try {
      if (SQLInjectionScanner.scanMethod(id)) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: `/api/units/${id}`,
          method: "PUT",
          eventType: "sql_injection_attempt",
          severity: "critical",
          details: { reason: "SQL injection attempt", id },
        });
        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          "Invalid unit ID format"
        );
      }

      const body = await request.json();
      const validation = updateBargainingUnitSchema.safeParse(body);
      
      if (!validation.success) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: `/api/units/${id}`,
          method: "PUT",
          eventType: "validation_failed",
          severity: "medium",
          details: { errors: validation.error.errors, unitId: id },
        });
        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          "Invalid bargaining unit data",
          validation.error
        );
      }

      const existing = await getBargainingUnitById(id);
      if (!existing) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: `/api/units/${id}`,
          method: "PUT",
          eventType: "validation_failed",
          severity: "medium",
          details: { unitId: id },
        });
        return standardErrorResponse(
          ErrorCode.RESOURCE_NOT_FOUND,
          "Bargaining unit not found"
        );
      }

      const unit = await updateBargainingUnit(id, {
        ...validation.data,
        updatedBy: userId,
      } as any);

      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: `/api/units/${id}`,
        method: "PUT",
        eventType: "success",
        severity: "medium",
        details: { unitId: id, name: unit.name },
      });

      return standardSuccessResponse({ unit });
    } catch (error) {
      logger.error("Error updating unit", { error, userId, id });
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: `/api/units/${id}`,
        method: "PUT",
        eventType: "validation_failed",
        severity: "high",
        details: { error: String(error), unitId: id },
      });
      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        "Failed to update bargaining unit"
      );
    }
  })(request, { params });
};

/**
 * DELETE /api/units/[id]
 */
export const DELETE = async (request: NextRequest, { params }: RouteParams) => {
  return withAdminAuth(async (request, context) => {
    const { userId } = context;
    const { id } = params;

    try {
      if (SQLInjectionScanner.scanMethod(id)) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: `/api/units/${id}`,
          method: "DELETE",
          eventType: "sql_injection_attempt",
          severity: "critical",
          details: { reason: "SQL injection attempt", id },
        });
        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          "Invalid unit ID format"
        );
      }

      const existing = await getBargainingUnitById(id);
      if (!existing) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: `/api/units/${id}`,
          method: "DELETE",
          eventType: "validation_failed",
          severity: "medium",
          details: { unitId: id },
        });
        return standardErrorResponse(
          ErrorCode.RESOURCE_NOT_FOUND,
          "Bargaining unit not found"
        );
      }

      await archiveBargainingUnit(id);

      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: `/api/units/${id}`,
        method: "DELETE",
        eventType: "success",
        severity: "high",
        details: { unitId: id, name: existing.name },
      });

      return standardSuccessResponse({ message: "Bargaining unit archived successfully" });
    } catch (error) {
      logger.error("Error archiving unit", { error, userId, id });
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: `/api/units/${id}`,
        method: "DELETE",
        eventType: "validation_failed",
        severity: "high",
        details: { error: String(error), unitId: id },
      });
      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        "Failed to archive bargaining unit"
      );
    }
  })(request, { params });
};
