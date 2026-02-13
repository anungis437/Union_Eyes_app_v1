/**
 * Alert Rule Detail API
 */

import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { withRLSContext } from "@/lib/db/with-rls-context";
import { withRoleAuth } from "@/lib/api-auth-guard";
import {
  alertActions,
  alertConditions,
  alertFrequency,
  alertRules,
  alertSeverity,
  alertTriggerType,
  alertActionType,
  alertConditionOperator,
} from "@/db/schema";
import {
  ErrorCode,
  standardErrorResponse,
  standardSuccessResponse,
} from "@/lib/api/standardized-responses";

const updateRuleSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
  category: z.string().max(100).optional(),
  triggerType: z.enum(alertTriggerType.enumValues).optional(),
  triggerConfig: z.record(z.unknown()).optional(),
  severity: z.enum(alertSeverity.enumValues).optional(),
  frequency: z.enum(alertFrequency.enumValues).optional(),
  rateLimitMinutes: z.number().int().min(1).optional(),
  isEnabled: z.boolean().optional(),
  conditions: z
    .array(
      z.object({
        fieldPath: z.string().min(1).max(255),
        operator: z.enum(alertConditionOperator.enumValues),
        value: z.unknown().optional(),
        conditionGroup: z.number().int().min(1).optional(),
        isOrCondition: z.boolean().optional(),
        orderIndex: z.number().int().min(0).optional(),
      })
    )
    .optional(),
  actions: z
    .array(
      z.object({
        actionType: z.enum(alertActionType.enumValues),
        actionConfig: z.record(z.unknown()).default({}),
        orderIndex: z.number().int().min(0).optional(),
        executeIfCondition: z.record(z.unknown()).optional(),
        maxRetries: z.number().int().min(0).optional(),
        retryDelaySeconds: z.number().int().min(1).optional(),
      })
    )
    .optional(),
});

const paramsSchema = z.object({
  id: z.string().uuid(),
});

export const PATCH = withRoleAuth("admin", async (request, context) => {
  const paramsParse = paramsSchema.safeParse(context.params);
  if (!paramsParse.success) {
    return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      "Invalid alert rule id",
      paramsParse.error.flatten().fieldErrors
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return standardErrorResponse(ErrorCode.VALIDATION_ERROR, "Invalid JSON body");
  }

  const parsed = updateRuleSchema.safeParse(body);
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

  const ruleId = paramsParse.data.id;
  const payload = parsed.data;
  const { conditions, actions, ...ruleUpdates } = payload;

  try {
    return await withRLSContext(async (tx) => {
      const [updatedRule] = await tx
        .update(alertRules)
        .set({
          ...ruleUpdates,
          updatedAt: new Date(),
        })
        .where(and(eq(alertRules.id, ruleId), eq(alertRules.organizationId, organizationId)))
        .returning();

      if (!updatedRule) {
        return standardErrorResponse(
          ErrorCode.RESOURCE_NOT_FOUND,
          "Alert rule not found"
        );
      }

      if (conditions) {
        await tx.delete(alertConditions).where(eq(alertConditions.alertRuleId, ruleId));
        if (conditions.length > 0) {
          await tx.insert(alertConditions).values(
            conditions.map((condition, index) => ({
              alertRuleId: ruleId,
              fieldPath: condition.fieldPath,
              operator: condition.operator,
              value: condition.value ?? null,
              conditionGroup: condition.conditionGroup ?? 1,
              isOrCondition: condition.isOrCondition ?? false,
              orderIndex: condition.orderIndex ?? index,
            }))
          );
        }
      }

      if (actions) {
        await tx.delete(alertActions).where(eq(alertActions.alertRuleId, ruleId));
        if (actions.length > 0) {
          await tx.insert(alertActions).values(
            actions.map((action, index) => ({
              alertRuleId: ruleId,
              actionType: action.actionType,
              actionConfig: action.actionConfig ?? {},
              orderIndex: action.orderIndex ?? index,
              executeIfCondition: action.executeIfCondition ?? null,
              maxRetries: action.maxRetries ?? 3,
              retryDelaySeconds: action.retryDelaySeconds ?? 60,
            }))
          );
        }
      }

      return standardSuccessResponse({ rule: updatedRule });
    });
  } catch (error) {
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      "Failed to update alert rule",
      error instanceof Error ? { message: error.message } : undefined
    );
  }
});

export const DELETE = withRoleAuth("admin", async (_request, context) => {
  const paramsParse = paramsSchema.safeParse(context.params);
  if (!paramsParse.success) {
    return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      "Invalid alert rule id",
      paramsParse.error.flatten().fieldErrors
    );
  }

  const { organizationId } = context;
  if (!organizationId) {
    return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      "organizationId is required"
    );
  }

  const ruleId = paramsParse.data.id;

  try {
    return await withRLSContext(async (tx) => {
      const [updatedRule] = await tx
        .update(alertRules)
        .set({
          isDeleted: true,
          isEnabled: false,
          updatedAt: new Date(),
        })
        .where(and(eq(alertRules.id, ruleId), eq(alertRules.organizationId, organizationId)))
        .returning();

      if (!updatedRule) {
        return standardErrorResponse(
          ErrorCode.RESOURCE_NOT_FOUND,
          "Alert rule not found"
        );
      }

      return standardSuccessResponse({ rule: updatedRule });
    });
  } catch (error) {
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      "Failed to delete alert rule",
      error instanceof Error ? { message: error.message } : undefined
    );
  }
});
