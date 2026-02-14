import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/db";
import { reservedMatterVotes } from "@/db/schema/domains/governance";
import { withEnhancedRoleAuth } from "@/lib/api-auth-guard";
import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { governanceService } from "@/services/governance-service";

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
const listReservedMattersSchema = z.object({
  status: z.string().optional(),
  limit: z.string().optional().transform(value => (value ? parseInt(value, 10) : 50)),
});

const createReservedMatterSchema = z.object({
  matterType: z.enum(["mission_change", "sale_control", "data_governance", "major_contract"]),
  title: z.string().min(3),
  description: z.string().min(3),
  proposedBy: z.string().min(2),
  votingDeadline: z.string().min(1),
  matterDetails: z.record(z.unknown()),
  classATotalVotes: z.number().int().min(1),
});

export const GET = async (request: NextRequest) =>
  withEnhancedRoleAuth<any>(10, async (_request, context) => {
    const { userId } = context;
    const parsed = listReservedMattersSchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams)
    );

    if (!parsed.success) {
      return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid request parameters'
    );
    }

    try {
      const { status, limit } = parsed.data;
      const records = await db
        .select()
        .from(reservedMatterVotes)
        .where(status ? eq(reservedMatterVotes.status, status) : undefined)
        .orderBy(desc(reservedMatterVotes.proposedDate))
        .limit(limit || 50);

      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: "/api/governance/reserved-matters",
        method: "GET",
        eventType: "success",
        severity: "low",
        details: { resultCount: records.length },
      });

      return standardSuccessResponse({ data: records });
    } catch (error) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: "/api/governance/reserved-matters",
        method: "GET",
        eventType: "auth_failed",
        severity: "high",
        details: { error: error instanceof Error ? error.message : "Unknown error" },
      });

      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch reserved matters',
      error
    );
    }
  })(request, {});

export const POST = async (request: NextRequest) =>
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

    const parsed = createReservedMatterSchema.safeParse(rawBody);
    if (!parsed.success) {
      return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid request body',
      parsed.error
    );
    }

    try {
      const body = parsed.data;
      const vote = await governanceService.requestReservedMatterVote({
        matterType: body.matterType,
        title: body.title,
        description: body.description,
        proposedBy: body.proposedBy,
        votingDeadline: new Date(body.votingDeadline),
        matterDetails: body.matterDetails,
        classATotalVotes: body.classATotalVotes,
      });

      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: "/api/governance/reserved-matters",
        method: "POST",
        eventType: "success",
        severity: "high",
        details: { voteId: vote.id, matterType: body.matterType },
      });

      return standardSuccessResponse({ data: vote });
    } catch (error) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: "/api/governance/reserved-matters",
        method: "POST",
        eventType: "auth_failed",
        severity: "high",
        details: { error: error instanceof Error ? error.message : "Unknown error" },
      });

      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to create reserved matter',
      error
    );
    }
  })(request, {});

