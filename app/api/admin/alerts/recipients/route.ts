/**
 * Alert Recipients API
 */

import { z } from "zod";
import { and, desc } from "drizzle-orm";
import { withRLSContext } from "@/lib/db/with-rls-context";
import { withRoleAuth } from "@/lib/api-auth-guard";
import { alertRecipients } from "@/db/schema";
import { standardSuccessResponse,
} from "@/lib/api/standardized-responses";

const listRecipientsSchema = z.object({
  ruleId: z.string().uuid().optional(),
  limit: z.string().optional().transform((value) => (value ? parseInt(value, 10) : 50)),
  offset: z.string().optional().transform((value) => (value ? parseInt(value, 10) : 0)),
});

const createRecipientSchema = z.object({
  alertRuleId: z.string().uuid(),
  recipientType: z.string().min(1).max(50),
  recipientId: z.string().uuid().optional(),
  recipientValue: z.string().min(1).max(255).optional(),
  deliveryMethods: z.array(z.string().min(1)).min(1),
  quietHoursStart: z.string().optional(),
  quietHoursEnd: z.string().optional(),
});

export const GET = withRoleAuth("admin", async (request, context) => {
  const parsed = listRecipientsSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) {
    return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      "Invalid request parameters",
      parsed.error.flatten().fieldErrors
    );
  }

  const query = parsed.data;

  try {
    return await withRLSContext(async (tx: Record<string, unknown>) => {
      const conditions = [] as Array<Record<string, unknown>>;
      if (query.ruleId) {
        conditions.push(eq(alertRecipients.alertRuleId, query.ruleId));
      }

      const recipients = await tx
        .select()
        .from(alertRecipients)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(alertRecipients.createdAt))
        .limit(query.limit ?? 50)
        .offset(query.offset ?? 0);

      return standardSuccessResponse({ recipients });
    });
  } catch (error) {
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      "Failed to fetch alert recipients",
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

  const parsed = createRecipientSchema.safeParse(body);
  if (!parsed.success) {
    return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      "Invalid request body",
      parsed.error.flatten().fieldErrors
    );
  }

  const payload = parsed.data;

  try {
    return await withRLSContext(async (tx: Record<string, unknown>) => {
      const [recipient] = await tx
        .insert(alertRecipients)
        .values({
          alertRuleId: payload.alertRuleId,
          recipientType: payload.recipientType,
          recipientId: payload.recipientId,
          recipientValue: payload.recipientValue,
          deliveryMethods: payload.deliveryMethods,
          quietHoursStart: payload.quietHoursStart,
          quietHoursEnd: payload.quietHoursEnd,
        })
        .returning();

      if (!recipient) {
        return standardErrorResponse(
          ErrorCode.DATABASE_ERROR,
          "Failed to create alert recipient"
        );
      }

      return standardSuccessResponse({ recipient });
    });
  } catch (error) {
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      "Failed to create alert recipient",
      error instanceof Error ? { message: error.message } : undefined
    );
  }
});
