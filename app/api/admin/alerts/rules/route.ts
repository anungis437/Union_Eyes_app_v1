/**
 * Alert Rules API
 *
 * CRUD for alert rules with conditions and actions.
 */

import { z } from "zod";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
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

const listRulesSchema = z.object({
  organizationId: z.string().uuid().optional(),
  category: z.string().optional(),
  search: z.string().optional(),
  enabled: z.string().optional(),
  limit: z.string().optional().transform((value) => (value ? parseInt(value, 10) : 50)),
  offset: z.string().optional().transform((value) => (value ? parseInt(value, 10) : 0)),
});

const createRuleSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  category: z.string().max(100).optional(),
  triggerType: z.enum(alertTriggerType.enumValues),
  triggerConfig: z.record(z.unknown()).default({}),
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
    .default([]),
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
    .default([]),
});

export const GET = withRoleAuth("admin", async (request, context) => {
  const parsed = listRulesSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) {
    return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      "Invalid request parameters",
      parsed.error.flatten().fieldErrors
    );
  }

  const { organizationId } = context;
  const query = parsed.data;
  const scopeOrgId = query.organizationId || organizationId;

  if (!scopeOrgId) {
    return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      "organizationId is required"
    );
  }

  try {
    return await withRLSContext(async (tx: any) => {
      const filters = [eq(alertRules.organizationId, scopeOrgId), eq(alertRules.isDeleted, false)];

      if (query.category) {
        filters.push(eq(alertRules.category, query.category));
      }

      if (query.enabled === "true") {
        filters.push(eq(alertRules.isEnabled, true));
      }

      if (query.enabled === "false") {
        filters.push(eq(alertRules.isEnabled, false));
      }

      if (query.search) {
        filters.push(sql`(${alertRules.name} ILIKE ${`%${query.search}%`} OR ${alertRules.description} ILIKE ${`%${query.search}%`})`);
      }

      const rules = await tx
        .select()
        .from(alertRules)
        .where(and(...filters))
        .orderBy(desc(alertRules.createdAt))
        .limit(query.limit ?? 50)
        .offset(query.offset ?? 0);

      if (rules.length === 0) {
        return standardSuccessResponse({ rules: [], count: 0 });
      }

      const ruleIds = rules.map((rule: any) => rule.id);

      const conditionCounts = await tx
        .select({
          alertRuleId: alertConditions.alertRuleId,
          count: sql<number>`count(*)`,
        })
        .from(alertConditions)
        .where(inArray(alertConditions.alertRuleId, ruleIds))
        .groupBy(alertConditions.alertRuleId);

      const actionCounts = await tx
        .select({
          alertRuleId: alertActions.alertRuleId,
          count: sql<number>`count(*)`,
        })
        .from(alertActions)
        .where(inArray(alertActions.alertRuleId, ruleIds))
        .groupBy(alertActions.alertRuleId);

      const conditionMap = new Map(conditionCounts.map((row: any) => [row.alertRuleId, row.count]));
      const actionMap = new Map(actionCounts.map((row: any) => [row.alertRuleId, row.count]));

      const data = rules.map((rule: any) => ({
        ...rule,
        conditionsCount: conditionMap.get(rule.id) ?? 0,
        actionsCount: actionMap.get(rule.id) ?? 0,
      }));

      return standardSuccessResponse({
        rules: data,
        count: data.length,
      });
    });
  } catch (error) {
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      "Failed to fetch alert rules",
      error instanceof Error ? { message: error.message } : undefined
    );
  }
});

export const POST = withRoleAuth("admin", async (request, context) => {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return standardErrorResponse(ErrorCode.VALIDATION_ERROR, "Invalid JSON body");
  }

  const parsed = createRuleSchema.safeParse(body);
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

  const payload = parsed.data;

  try {
    return await withRLSContext(async (tx: any) => {
      const [createdRule] = await tx
        .insert(alertRules)
        .values({
          organizationId,
          name: payload.name,
          description: payload.description,
          category: payload.category,
          triggerType: payload.triggerType,
          triggerConfig: payload.triggerConfig,
          severity: payload.severity,
          frequency: payload.frequency,
          rateLimitMinutes: payload.rateLimitMinutes,
          isEnabled: payload.isEnabled ?? true,
          createdBy: userId,
        })
        .returning();

      if (!createdRule) {
        return standardErrorResponse(ErrorCode.DATABASE_ERROR, "Failed to create alert rule");
      }

      if (payload.conditions.length > 0) {
        await tx.insert(alertConditions).values(
          payload.conditions.map((condition, index) => ({
            alertRuleId: createdRule.id,
            fieldPath: condition.fieldPath,
            operator: condition.operator,
            value: condition.value ?? null,
            conditionGroup: condition.conditionGroup ?? 1,
            isOrCondition: condition.isOrCondition ?? false,
            orderIndex: condition.orderIndex ?? index,
          }))
        );
      }

      if (payload.actions.length > 0) {
        await tx.insert(alertActions).values(
          payload.actions.map((action, index) => ({
            alertRuleId: createdRule.id,
            actionType: action.actionType,
            actionConfig: action.actionConfig ?? {},
            orderIndex: action.orderIndex ?? index,
            executeIfCondition: action.executeIfCondition ?? null,
            maxRetries: action.maxRetries ?? 3,
            retryDelaySeconds: action.retryDelaySeconds ?? 60,
          }))
        );
      }

      return standardSuccessResponse({ rule: createdRule });
    });
  } catch (error) {
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      "Failed to create alert rule",
      error instanceof Error ? { message: error.message } : undefined
    );
  }
});
