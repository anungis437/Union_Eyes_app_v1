/**
 * Worksite Detail API Routes
 * 
 * Get, update, or archive specific worksite by ID.
 * 
 * @module app/api/worksites/[id]/route
 */

import { withAdminAuth } from "@/lib/api-auth-guard";
import {
  getWorksiteById,
  updateWorksite,
  archiveWorksite,
} from "@/db/queries/union-structure-queries";
import { updateWorksiteSchema } from "@/lib/validation/union-structure-schemas";
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
 * GET /api/worksites/[id]
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
          endpoint: `/api/worksites/${id}`,
          method: "GET",
          eventType: "sql_injection_attempt",
          severity: "critical",
          details: { reason: "SQL injection attempt", id },
        });
        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          "Invalid worksite ID format"
        );
      }

      const worksite = await getWorksiteById(id);

      if (!worksite) {
        return standardErrorResponse(
          ErrorCode.RESOURCE_NOT_FOUND,
          "Worksite not found"
        );
      }

      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: `/api/worksites/${id}`,
        method: "GET",
        eventType: "success",
        severity: "low",
        details: { worksiteId: id, name: worksite.name },
      });

      return standardSuccessResponse({ worksite });
    } catch (error) {
      logger.error("Error fetching worksite", { error, userId, id });
      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        "Failed to fetch worksite"
      );
    }
  })(request, { params });
};

/**
 * PUT /api/worksites/[id]
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
          endpoint: `/api/worksites/${id}`,
          method: "PUT",
          eventType: "sql_injection_attempt",
          severity: "critical",
          details: { reason: "SQL injection attempt", id },
        });
        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          "Invalid worksite ID format"
        );
      }

      const body = await request.json();
      const validation = updateWorksiteSchema.safeParse(body);
      
      if (!validation.success) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: `/api/worksites/${id}`,
          method: "PUT",
          eventType: "validation_failed",
          severity: "medium",
          details: { errors: validation.error.errors, worksiteId: id },
        });
        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          "Invalid worksite data",
          validation.error
        );
      }

      const existing = await getWorksiteById(id);
      if (!existing) {
        return standardErrorResponse(
          ErrorCode.RESOURCE_NOT_FOUND,
          "Worksite not found"
        );
      }

      const worksite = await updateWorksite(id, {
        ...validation.data,
        updatedBy: userId,
      });

      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: `/api/worksites/${id}`,
        method: "PUT",
        eventType: "success",
        severity: "low",
        details: { worksiteId: id, name: worksite.name },
      });

      return standardSuccessResponse({ worksite });
    } catch (error) {
      logger.error("Error updating worksite", { error, userId, id });
      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        "Failed to update worksite"
      );
    }
  })(request, { params });
};

/**
 * DELETE /api/worksites/[id]
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
          endpoint: `/api/worksites/${id}`,
          method: "DELETE",
          eventType: "sql_injection_attempt",
          severity: "critical",
          details: { reason: "SQL injection attempt", id },
        });
        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          "Invalid worksite ID format"
        );
      }

      const existing = await getWorksiteById(id);
      if (!existing) {
        return standardErrorResponse(
          ErrorCode.RESOURCE_NOT_FOUND,
          "Worksite not found"
        );
      }

      await archiveWorksite(id);

      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: `/api/worksites/${id}`,
        method: "DELETE",
        eventType: "success",
        severity: "low",
        details: { worksiteId: id, name: existing.name },
      });

      return standardSuccessResponse({ message: "Worksite archived successfully" });
    } catch (error) {
      logger.error("Error archiving worksite", { error, userId, id });
      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        "Failed to archive worksite"
      );
    }
  })(request, { params });
};
