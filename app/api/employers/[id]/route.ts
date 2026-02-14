/**
 * Employer Detail API Routes
 * 
 * Get, update, or archive specific employer by ID.
 * 
 * @module app/api/employers/[id]/route
 */

import { withAdminAuth } from "@/lib/api-auth-guard";
import {
  getEmployerById,
  updateEmployer,
  archiveEmployer,
} from "@/db/queries/union-structure-queries";
import { updateEmployerSchema } from "@/lib/validation/union-structure-schemas";
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
 * GET /api/employers/[id]
 * Get employer by ID
 */
export const GET = async (request: NextRequest, { params }: RouteParams) => {
  return withAdminAuth(async (request, context) => {
    const { userId } = context;
    const { id } = params;

    try {
      // SQL injection check
      if (SQLInjectionScanner.scanMethod(id)) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: `/api/employers/${id}`,
          method: "GET",
          eventType: "sql_injection_attempt",
          severity: "critical",
          details: { reason: "SQL injection attempt in employer ID", id },
        });
        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          "Invalid employer ID format"
        );
      }

      const employer = await getEmployerById(id);

      if (!employer) {
        return standardErrorResponse(
          ErrorCode.RESOURCE_NOT_FOUND,
          "Employer not found"
        );
      }

      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: `/api/employers/${id}`,
        method: "GET",
        eventType: "success",
        severity: "low",
        details: { employerId: id, name: employer.name },
      });

      return standardSuccessResponse({ employer });
    } catch (error) {
      logger.error("Error fetching employer", { error, userId, id });
      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        "Failed to fetch employer"
      );
    }
  })(request, { params });
};

/**
 * PUT /api/employers/[id]
 * Update employer
 */
export const PUT = async (request: NextRequest, { params }: RouteParams) => {
  return withAdminAuth(async (request, context) => {
    const { userId } = context;
    const { id } = params;

    try {
      // SQL injection check
      if (SQLInjectionScanner.scanMethod(id)) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: `/api/employers/${id}`,
          method: "PUT",
          eventType: "sql_injection_attempt",
          severity: "critical",
          details: { reason: "SQL injection attempt in employer ID", id },
        });
        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          "Invalid employer ID format"
        );
      }

      const body = await request.json();

      // Validate input
      const validation = updateEmployerSchema.safeParse(body);
      if (!validation.success) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: `/api/employers/${id}`,
          method: "PUT",
          eventType: "validation_failed",
          severity: "medium",
          details: { errors: validation.error.errors, employerId: id },
        });
        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          "Invalid employer data",
          validation.error
        );
      }

      // Check if employer exists
      const existing = await getEmployerById(id);
      if (!existing) {
        return standardErrorResponse(
          ErrorCode.RESOURCE_NOT_FOUND,
          "Employer not found"
        );
      }

      // Update employer
      const employer = await updateEmployer(id, {
        ...validation.data,
        updatedBy: userId,
      });

      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: `/api/employers/${id}`,
        method: "PUT",
        eventType: "success",
        severity: "low",
        details: { employerId: id, name: employer.name },
      });

      return standardSuccessResponse({ employer });
    } catch (error) {
      logger.error("Error updating employer", { error, userId, id });
      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        "Failed to update employer"
      );
    }
  })(request, { params });
};

/**
 * DELETE /api/employers/[id]
 * Archive employer (soft delete)
 */
export const DELETE = async (request: NextRequest, { params }: RouteParams) => {
  return withAdminAuth(async (request, context) => {
    const { userId } = context;
    const { id } = params;

    try {
      // SQL injection check
      if (SQLInjectionScanner.scanMethod(id)) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: `/api/employers/${id}`,
          method: "DELETE",
          eventType: "sql_injection_attempt",
          severity: "critical",
          details: { reason: "SQL injection attempt in employer ID", id },
        });
        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          "Invalid employer ID format"
        );
      }

      // Check if employer exists
      const existing = await getEmployerById(id);
      if (!existing) {
        return standardErrorResponse(
          ErrorCode.RESOURCE_NOT_FOUND,
          "Employer not found"
        );
      }

      // Archive employer
      await archiveEmployer(id);

      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: `/api/employers/${id}`,
        method: "DELETE",
        eventType: "success",
        severity: "low",
        details: { employerId: id, name: existing.name },
      });

      return standardSuccessResponse({ message: "Employer archived successfully" });
    } catch (error) {
      logger.error("Error archiving employer", { error, userId, id });
      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        "Failed to archive employer"
      );
    }
  })(request, { params });
};
