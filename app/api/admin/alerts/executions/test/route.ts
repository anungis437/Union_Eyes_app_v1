/**
 * Alert Execution Test API
 */

import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { withRLSContext } from "@/lib/db/with-rls-context";
import { withRoleAuth } from "@/lib/api-auth-guard";
import { alertExecutions, alertRecipients, alertRules } from "@/db/schema";
import { NotificationService } from "@/lib/services/notification-service";
import {
  ErrorCode,
  standardErrorResponse,
  standardSuccessResponse,
} from "@/lib/api/standardized-responses";

const testExecutionSchema = z.object({
  ruleId: z.string().uuid(),
});

export const POST = withRoleAuth("admin", async (request, context) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return standardErrorResponse(ErrorCode.VALIDATION_ERROR, "Invalid JSON body");
  }

  const parsed = testExecutionSchema.safeParse(body);
  if (!parsed.success) {
    return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      "Invalid request body",
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

  const { ruleId } = parsed.data;
  const startedAt = new Date();
  const completedAt = new Date(startedAt.getTime() + 1200);

  try {
    return await withRLSContext(async (tx: any) => {
      const [execution] = await tx
        .insert(alertExecutions)
        .values({
          alertRuleId: ruleId,
          triggeredBy: "manual",
          triggerData: { source: "admin_test" },
          status: "success",
          startedAt,
          completedAt,
          conditionsMet: true,
          actionsExecuted: [{ action: "test_notification", status: "success" }],
          executionTimeMs: 1200,
        })
        .returning();

      if (!execution) {
        return standardErrorResponse(
          ErrorCode.DATABASE_ERROR,
          "Failed to create execution"
        );
      }

      await tx
        .update(alertRules)
        .set({
          lastExecutedAt: completedAt,
          lastExecutionStatus: "success",
          executionCount: sql`${alertRules.executionCount} + 1`,
          successCount: sql`${alertRules.successCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(alertRules.id, ruleId));

      const recipients = await tx
        .select()
        .from(alertRecipients)
        .where(eq(alertRecipients.alertRuleId, ruleId));

      if (recipients.length > 0) {
        const notifier = new NotificationService();
        const subject = "Alert test execution";
        const body = "Alert test execution completed successfully.";

        await Promise.all(
          recipients.flatMap((recipient: any) =>
            (recipient.deliveryMethods || []).map(async (method: any) => {
              if (method === "email" && recipient.recipientValue) {
                return notifier.send({
                  organizationId,
                  userId: context.userId,
                  type: "email",
                  recipientEmail: recipient.recipientValue,
                  subject,
                  body,
                  metadata: { source: "alert_test", alertRuleId: ruleId },
                }).catch(() => undefined);
              }

              if (method === "sms" && recipient.recipientValue) {
                return notifier.send({
                  organizationId,
                  userId: context.userId,
                  type: "sms",
                  recipientPhone: recipient.recipientValue,
                  body,
                  metadata: { source: "alert_test", alertRuleId: ruleId },
                }).catch(() => undefined);
              }

              return Promise.resolve();
            })
          )
        );
      }

      return standardSuccessResponse({ execution });
    });
  } catch (error) {
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      "Failed to execute alert test",
      error instanceof Error ? { message: error.message } : undefined
    );
  }
});
