import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db/db";
import { reservedMatterVotes } from "@/db/schema/governance-schema";
import { withEnhancedRoleAuth } from "@/lib/api-auth-guard";
import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { governanceService } from "@/services/governance-service";

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

export const GET = async (request: NextRequest, { params }: RouteParams) =>
  withEnhancedRoleAuth(10, async (_request, context) => {
    const { userId } = context;

    try {
      const [record] = await db
        .select()
        .from(reservedMatterVotes)
        .where(eq(reservedMatterVotes.id, params.id))
        .limit(1);

      if (!record) {
        return NextResponse.json({ error: "Reserved matter vote not found" }, { status: 404 });
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

      return NextResponse.json({ success: true, data: record });
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

      return NextResponse.json({ error: "Failed to fetch reserved matter" }, { status: 500 });
    }
  })(request, { params });

export const PATCH = async (request: NextRequest, { params }: RouteParams) =>
  withEnhancedRoleAuth(20, async (_request, context) => {
    const { userId } = context;

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
    }

    const parsed = classAVoteSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
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

      return NextResponse.json({ success: true, data: result });
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

      return NextResponse.json({ error: "Failed to record Class A vote" }, { status: 500 });
    }
  })(request, { params });
