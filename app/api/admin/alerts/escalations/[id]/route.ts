/**
 * Alert Escalation Detail API
 */

import { z } from "zod";
import { and } from "drizzle-orm";
import { withRLSContext } from "@/lib/db/with-rls-context";
import { withRoleAuth } from "@/lib/api-auth-guard";
import { alertEscalations, escalationStatus } from "@/db/schema";
import { standardSuccessResponse,
} from "@/lib/api/standardized-responses";

const paramsSchema = z.object({
  id: z.string().uuid(),
});

const updateEscalationSchema = z.object({
  status: z.enum(escalationStatus.enumValues).optional(),
  currentLevel: z.number().int().min(1).optional(),
  resolutionNotes: z.string().max(2000).optional(),
});

export const PATCH = withRoleAuth("admin", async (request, context) => {
  const paramsParse = paramsSchema.safeParse(context.params);
  if (!paramsParse.success) {
    return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      "Invalid escalation id",
      paramsParse.error.flatten().fieldErrors
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return standardErrorResponse(ErrorCode.VALIDATION_ERROR, "Invalid JSON body");
  }

  const parsed = updateEscalationSchema.safeParse(body);
  if (!parsed.success) {
    return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      "Invalid request body",
      parsed.error.flatten().fieldErrors
    );
  }

  const { organizationId, userId } = context;
  if (!organizationId) {
    return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      "organizationId is required"
    );
  }

  const escalationId = paramsParse.data.id;
  const payload = parsed.data;

  const resolved = payload.status === "resolved";
  const resolvedAt = resolved ? new Date() : null;
  const resolvedBy = resolved ? userId : null;

  try {
    return await withRLSContext(async (tx) => {
      const [updated] = await tx
        .update(alertEscalations)
        .set({
          ...payload,
          resolvedAt: resolvedAt ?? undefined,
          resolvedBy: resolvedBy ?? undefined,
          updatedAt: new Date(),
        })
        .where(and(eq(alertEscalations.id, escalationId), eq(alertEscalations.organizationId, organizationId)))
        .returning();

      if (!updated) {
        return standardErrorResponse(
          ErrorCode.RESOURCE_NOT_FOUND,
          "Escalation not found"
        );
      }

      return standardSuccessResponse({ escalation: updated });
    });
  } catch (error) {
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      "Failed to update escalation",
      error instanceof Error ? { message: error.message } : undefined
    );
  }
});
