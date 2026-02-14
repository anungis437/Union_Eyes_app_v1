/**
 * Committee Detail API Routes
 * 
 * Get, update, or archive specific committee by ID.
 * 
 * @module app/api/committees/[id]/route
 */

import { withAdminAuth } from "@/lib/api-auth-guard";
import {
  getCommitteeById,
  updateCommittee,
  archiveCommittee,
} from "@/db/queries/union-structure-queries";
import { updateCommitteeSchema } from "@/lib/validation/union-structure-schemas";
import { logApiAuditEvent, SQLInjectionScanner } from "@/lib/middleware/api-security";
import { standardSuccessResponse,
} from "@/lib/api/standardized-responses";
import { logger } from "@/lib/logger";

type RouteParams = {
  params: {
    id: string;
  };
};

/**
 * GET /api/committees/[id]
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
          endpoint: `/api/committees/${id}`,
          method: "GET",
          eventType: "sql_injection_attempt",
          severity: "critical",
          details: { reason: "SQL injection attempt", id },
        });
        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          "Invalid committee ID format"
        );
      }

      const committee = await getCommitteeById(id);

      if (!committee) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: `/api/committees/${id}`,
          method: "GET",
          eventType: "validation_failed",
          severity: "medium",
          details: { committeeId: id },
        });
        return standardErrorResponse(
          ErrorCode.RESOURCE_NOT_FOUND,
          "Committee not found"
        );
      }

      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: `/api/committees/${id}`,
        method: "GET",
        eventType: "success",
        severity: "low",
        details: { committeeId: id, name: committee.name },
      });

      return standardSuccessResponse({ committee });
    } catch (error) {
      logger.error("Error fetching committee", { error, userId, id });
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: `/api/committees/${id}`,
        method: "GET",
        eventType: "validation_failed",
        severity: "high",
        details: { error: String(error), committeeId: id },
      });
      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        "Failed to fetch committee"
      );
    }
  })(request, { params });
};

/**
 * PUT /api/committees/[id]
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
          endpoint: `/api/committees/${id}`,
          method: "PUT",
          eventType: "sql_injection_attempt",
          severity: "critical",
          details: { reason: "SQL injection attempt", id },
        });
        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          "Invalid committee ID format"
        );
      }

      const body = await request.json();
      const validation = updateCommitteeSchema.safeParse(body);
      
      if (!validation.success) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: `/api/committees/${id}`,
          method: "PUT",
          eventType: "validation_failed",
          severity: "medium",
          details: { errors: validation.error.errors, committeeId: id },
        });
        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          "Invalid committee data",
          validation.error
        );
      }

      const existing = await getCommitteeById(id);
      if (!existing) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: `/api/committees/${id}`,
          method: "PUT",
          eventType: "validation_failed",
          severity: "medium",
          details: { committeeId: id },
        });
        return standardErrorResponse(
          ErrorCode.RESOURCE_NOT_FOUND,
          "Committee not found"
        );
      }

      const committee = await updateCommittee(id, {
        ...validation.data,
        updatedBy: userId,
      } as any);

      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: `/api/committees/${id}`,
        method: "PUT",
        eventType: "success",
        severity: "medium",
        details: { committeeId: id, name: committee.name },
      });

      return standardSuccessResponse({ committee });
    } catch (error) {
      logger.error("Error updating committee", { error, userId, id });
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: `/api/committees/${id}`,
        method: "PUT",
        eventType: "validation_failed",
        severity: "high",
        details: { error: String(error), committeeId: id },
      });
      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        "Failed to update committee"
      );
    }
  })(request, { params });
};

/**
 * DELETE /api/committees/[id]
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
          endpoint: `/api/committees/${id}`,
          method: "DELETE",
          eventType: "sql_injection_attempt",
          severity: "critical",
          details: { reason: "SQL injection attempt", id },
        });
        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          "Invalid committee ID format"
        );
      }

      const existing = await getCommitteeById(id);
      if (!existing) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: `/api/committees/${id}`,
          method: "DELETE",
          eventType: "validation_failed",
          severity: "medium",
          details: { committeeId: id },
        });
        return standardErrorResponse(
          ErrorCode.RESOURCE_NOT_FOUND,
          "Committee not found"
        );
      }

      await archiveCommittee(id);

      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: `/api/committees/${id}`,
        method: "DELETE",
        eventType: "success",
        severity: "high",
        details: { committeeId: id, name: existing.name },
      });

      return standardSuccessResponse({ message: "Committee archived successfully" });
    } catch (error) {
      logger.error("Error archiving committee", { error, userId, id });
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: `/api/committees/${id}`,
        method: "DELETE",
        eventType: "validation_failed",
        severity: "high",
        details: { error: String(error), committeeId: id },
      });
      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        "Failed to archive committee"
      );
    }
  })(request, { params });
};
