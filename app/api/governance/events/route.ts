import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { desc } from "drizzle-orm";
import { db } from "@/db/db";
import { governanceEvents } from "@/db/schema/domains/governance";
import { withEnhancedRoleAuth } from "@/lib/api-auth-guard";
import { logApiAuditEvent } from "@/lib/middleware/api-security";

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
const listEventsSchema = z.object({
  limit: z.string().optional().transform(value => (value ? parseInt(value, 10) : 50)),
});

export const GET = async (request: NextRequest) =>
  withEnhancedRoleAuth(10, async (_request, context) => {
    const { userId } = context;
    const parsed = listEventsSchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams)
    );

    if (!parsed.success) {
      return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid request parameters'
    );
    }

    try {
      const { limit } = parsed.data;
      const events = await db
        .select()
        .from(governanceEvents)
        .orderBy(desc(governanceEvents.eventDate))
        .limit(limit || 50);

      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: "/api/governance/events",
        method: "GET",
        eventType: "success",
        severity: "low",
        details: { resultCount: events.length },
      });

      return NextResponse.json({ success: true, data: events });
    } catch (error) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: "/api/governance/events",
        method: "GET",
        eventType: "auth_failed",
        severity: "high",
        details: { error: error instanceof Error ? error.message : "Unknown error" },
      });

      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch governance events',
      error
    );
    }
  })(request, {});

