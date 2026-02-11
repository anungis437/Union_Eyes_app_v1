import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/db";
import { reservedMatterVotes } from "@/db/schema/governance-schema";
import { withEnhancedRoleAuth } from "@/lib/api-auth-guard";
import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { governanceService } from "@/services/governance-service";

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
  withEnhancedRoleAuth(10, async (_request, context) => {
    const { userId } = context;
    const parsed = listReservedMattersSchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams)
    );

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request parameters" }, { status: 400 });
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

      return NextResponse.json({ success: true, data: records });
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

      return NextResponse.json({ error: "Failed to fetch reserved matters" }, { status: 500 });
    }
  })(request, {});

export const POST = async (request: NextRequest) =>
  withEnhancedRoleAuth(20, async (_request, context) => {
    const { userId } = context;

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
    }

    const parsed = createReservedMatterSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
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

      return NextResponse.json({ success: true, data: vote }, { status: 201 });
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

      return NextResponse.json({ error: "Failed to create reserved matter" }, { status: 500 });
    }
  })(request, {});

