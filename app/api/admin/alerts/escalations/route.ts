/**
 * Alert Escalations API
 */

import { z } from "zod";
import { and, desc, eq, inArray } from "drizzle-orm";
import { withRLSContext } from "@/lib/db/with-rls-context";
import { withRoleAuth } from "@/lib/api-auth-guard";
import { alertEscalations, alertRules, escalationStatus } from "@/db/schema";
import {
  ErrorCode,
  standardErrorResponse,
  standardSuccessResponse,
} from "@/lib/api/standardized-responses";

const listEscalationsSchema = z.object({
  status: z.string().optional(),
  ruleIds: z.string().optional(),
  limit: z.string().optional().transform((value) => (value ? parseInt(value, 10) : 50)),
  offset: z.string().optional().transform((value) => (value ? parseInt(value, 10) : 0)),
});

const createEscalationSchema = z.object({
  alertRuleId: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  escalationLevels: z.array(z.record(z.unknown())).optional(),
});

function getDefaultEscalationLevels() {
  return [
    { level: 1, notify: ["email"], delayMinutes: 0 },
    { level: 2, notify: ["slack"], delayMinutes: 15 },
    { level: 3, notify: ["pagerduty"], delayMinutes: 30 },
  ];
}

export const GET = withRoleAuth("admin", async (request, context) => {
  const parsed = listEscalationsSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
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
  const ruleIds = query.ruleIds ? query.ruleIds.split(",").filter(Boolean) : [];

  try {
    return await withRLSContext(async (tx: any) => {
      const conditions = [eq(alertEscalations.organizationId, organizationId)];

      if (query.status) {
        conditions.push(eq(alertEscalations.status, query.status as any));
      }

      if (ruleIds.length > 0) {
        conditions.push(inArray(alertEscalations.alertRuleId, ruleIds));
      }

      const escalations = await tx
        .select({
          id: alertEscalations.id,
          alertRuleId: alertEscalations.alertRuleId,
          alertRuleName: alertRules.name,
          name: alertEscalations.name,
          description: alertEscalations.description,
          escalationLevels: alertEscalations.escalationLevels,
          status: alertEscalations.status,
          currentLevel: alertEscalations.currentLevel,
          startedAt: alertEscalations.startedAt,
          nextEscalationAt: alertEscalations.nextEscalationAt,
          resolvedAt: alertEscalations.resolvedAt,
          resolvedBy: alertEscalations.resolvedBy,
          resolutionNotes: alertEscalations.resolutionNotes,
        })
        .from(alertEscalations)
        .leftJoin(alertRules, eq(alertRules.id, alertEscalations.alertRuleId))
        .where(and(...conditions))
        .orderBy(desc(alertEscalations.startedAt))
        .limit(query.limit ?? 50)
        .offset(query.offset ?? 0);

      return standardSuccessResponse({ escalations });
    });
  } catch (error) {
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      "Failed to fetch alert escalations",
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

  const parsed = createEscalationSchema.safeParse(body);
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

  const payload = parsed.data;

  try {
    return await withRLSContext(async (tx: any) => {
      const [escalation] = await tx
        .insert(alertEscalations)
        .values({
          organizationId,
          alertRuleId: payload.alertRuleId,
          name: payload.name,
          description: payload.description,
          escalationLevels: payload.escalationLevels ?? getDefaultEscalationLevels(),
          status: escalationStatus.enumValues[0],
          currentLevel: 1,
        })
        .returning();

      if (!escalation) {
        return standardErrorResponse(
          ErrorCode.DATABASE_ERROR,
          "Failed to create escalation"
        );
      }

      return standardSuccessResponse({ escalation });
    });
  } catch (error) {
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      "Failed to create escalation",
      error instanceof Error ? { message: error.message } : undefined
    );
  }
});
