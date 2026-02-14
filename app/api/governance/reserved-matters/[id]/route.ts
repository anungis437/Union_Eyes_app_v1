import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db/db";
import { reservedMatterVotes } from "@/db/schema/domains/governance";
import { withEnhancedRoleAuth } from "@/lib/api-auth-guard";
import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { governanceService } from "@/services/governance-service";

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode,
  StandardizedError,
  StandardizedSuccess 
} from '@/lib/api/standardized-responses';
interface RouteParams {
  params: {
    id: string;
  };
}

const classAVoteSchema = z.object({
  votesFor: z.number().int().min(0),
  votesAgainst: z.number().int().min(0),
  abstain: z.number().int().min(0),
});

export const GET = async (request: NextRequest, { params }: RouteParams) => {
  return withEnhancedRoleAuth<StandardizedError | StandardizedSuccess<any>>(10, async (_request, context) => {
    const { userId } = context;

    try {
      const [record] = await db
        .select()
        .from(reservedMatterVotes)
        .where(eq(reservedMatterVotes.id, params.id))
        .limit(1);

      if (!record) {
        return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Reserved matter vote not found'
    );
      }

      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: "/api/governance/reserved-matters/[id]",
        method: "GET",
        eventType: "success",
        severity: "low",
        details: { voteId: record.id },
      });

      return standardSuccessResponse(record);
    } catch (error) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: "/api/governance/reserved-matters/[id]",
        method: "GET",
        eventType: "auth_failed",
        severity: "high",
        details: { error: error instanceof Error ? error.message : "Unknown error" },
      });

      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch reserved matter',
      error
    );
    }
  })(request, { params });
};

export const PATCH = async (request: NextRequest, { params }: RouteParams) => {
  return withEnhancedRoleAuth<StandardizedError | StandardizedSuccess<any>>(20, async (_request, context) => {
    const { userId } = context;

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch (e) {
      return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid JSON in request body',
      e
    );
    }

    const parsed = classAVoteSchema.safeParse(rawBody);
    if (!parsed.success) {
      return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid request body',
      parsed.error
    );
    }

    try {
      const { votesFor, votesAgainst, abstain } = parsed.data;
      const result = await governanceService.recordClassAVote(
        params.id,
        votesFor,
        votesAgainst,
        abstain
      );

      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: "/api/governance/reserved-matters/[id]",
        method: "PATCH",
        eventType: "success",
        severity: "high",
        details: { voteId: params.id, percentFor: result.percentFor },
      });

      return standardSuccessResponse(result);
    } catch (error) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: "/api/governance/reserved-matters/[id]",
        method: "PATCH",
        eventType: "auth_failed",
        severity: "high",
        details: { error: error instanceof Error ? error.message : "Unknown error" },
      });

      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to record Class A vote',
      error
    );
    }
  })(request, { params });
};
