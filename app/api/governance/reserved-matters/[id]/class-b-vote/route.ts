import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withEnhancedRoleAuth } from "@/lib/api-auth-guard";
import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { governanceService } from "@/services/governance-service";

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
interface RouteParams {
  params: {
    id: string;
  };
}

const councilVoteSchema = z.object({
  vote: z.enum(["approve", "veto"]),
  voteRationale: z.string().min(3),
  councilMembersVoting: z.array(
    z.object({
      member: z.string().min(1),
      vote: z.enum(["approve", "veto"]),
      rationale: z.string().min(1),
    })
  ),
});

export const POST = async (request: NextRequest, { params }: RouteParams) =>
  withEnhancedRoleAuth<any>(20, async (_request, context) => {
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

    const parsed = councilVoteSchema.safeParse(rawBody);
    if (!parsed.success) {
      return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid request body',
      parsed.error
    );
    }

    try {
      const result = await governanceService.recordClassBVote({
        voteId: params.id,
        vote: parsed.data.vote,
        voteRationale: parsed.data.voteRationale,
        councilMembersVoting: parsed.data.councilMembersVoting,
      });

      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: "/api/governance/reserved-matters/[id]/class-b-vote",
        method: "POST",
        eventType: "success",
        severity: "high",
        details: { voteId: params.id, decision: result.finalDecision },
      });

      return standardSuccessResponse({ data: result });
    } catch (error) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: "/api/governance/reserved-matters/[id]/class-b-vote",
        method: "POST",
        eventType: "auth_failed",
        severity: "high",
        details: { error: error instanceof Error ? error.message : "Unknown error" },
      });

      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to record Class B vote',
      error
    );
    }
  })(request, { params });
