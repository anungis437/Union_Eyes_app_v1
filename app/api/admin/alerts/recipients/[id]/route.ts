/**
 * Alert Recipient Detail API
 */

import { z } from "zod";
import { eq } from "drizzle-orm";
import { withRLSContext } from "@/lib/db/with-rls-context";
import { withRoleAuth } from "@/lib/api-auth-guard";
import { alertRecipients } from "@/db/schema";
import {
  ErrorCode,
  standardErrorResponse,
  standardSuccessResponse,
} from "@/lib/api/standardized-responses";

const paramsSchema = z.object({
  id: z.string().uuid(),
});

export const DELETE = withRoleAuth("admin", async (_request, context) => {
  const paramsParse = paramsSchema.safeParse(context.params);
  if (!paramsParse.success) {
    return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      "Invalid recipient id",
      paramsParse.error.flatten().fieldErrors
    );
  }

  try {
    return await withRLSContext(async (tx) => {
      const [recipient] = await tx
        .delete(alertRecipients)
        .where(eq(alertRecipients.id, paramsParse.data.id))
        .returning();

      if (!recipient) {
        return standardErrorResponse(
          ErrorCode.RESOURCE_NOT_FOUND,
          "Alert recipient not found"
        );
      }

      return standardSuccessResponse({ recipient });
    });
  } catch (error) {
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      "Failed to delete alert recipient",
      error instanceof Error ? { message: error.message } : undefined
    );
  }
});
