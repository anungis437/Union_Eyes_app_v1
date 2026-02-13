/**
 * Alert Executions API
 */

import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { withRLSContext } from "@/lib/db/with-rls-context";
import { withRoleAuth } from "@/lib/api-auth-guard";
import { alertExecutions, alertRules } from "@/db/schema";
import {
  ErrorCode,
  standardErrorResponse,
  standardSuccessResponse,
} from "@/lib/api/standardized-responses";

const listExecutionsSchema = z.object({
  ruleId: z.string().uuid().optional(),
  status: z.string().optional(),
  limit: z.string().optional().transform((value) => (value ? parseInt(value, 10) : 50)),
  offset: z.string().optional().transform((value) => (value ? parseInt(value, 10) : 0)),
});

export const GET = withRoleAuth("admin", async (request, context) => {
  const parsed = listExecutionsSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) {
    return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      "Invalid request parameters",
      parsed.error.flatten().fieldErrors
    );
  }

  const { organizationId } = context;
  if (!organizationId) {
    return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      "organizationId is required"
    );
  }

  const query = parsed.data;

  try {
    return await withRLSContext(async (tx: any) => {
      const conditions = [eq(alertRules.organizationId, organizationId)];

      if (query.ruleId) {
        conditions.push(eq(alertExecutions.alertRuleId, query.ruleId));
      }

      if (query.status) {
        conditions.push(eq(alertExecutions.status, query.status as any));
      }

      const executions = await tx
        .select({
          id: alertExecutions.id,
          alertRuleId: alertExecutions.alertRuleId,
          alertRuleName: alertRules.name,
          triggeredBy: alertExecutions.triggeredBy,
          status: alertExecutions.status,
          conditionsMet: alertExecutions.conditionsMet,
          startedAt: alertExecutions.startedAt,
          completedAt: alertExecutions.completedAt,
          executionTimeMs: alertExecutions.executionTimeMs,
          actionsExecuted: alertExecutions.actionsExecuted,
          errorMessage: alertExecutions.errorMessage,
        })
        .from(alertExecutions)
        .leftJoin(alertRules, eq(alertRules.id, alertExecutions.alertRuleId))
        .where(and(...conditions))
        .orderBy(desc(alertExecutions.createdAt))
        .limit(query.limit ?? 50)
        .offset(query.offset ?? 0);

      return standardSuccessResponse({ executions });
    });
  } catch (error) {
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      "Failed to fetch alert executions",
      error instanceof Error ? { message: error.message } : undefined
    );
  }
});
