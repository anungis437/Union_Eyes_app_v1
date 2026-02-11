import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { desc } from "drizzle-orm";
import { db } from "@/db/db";
import { councilElections } from "@/db/schema/governance-schema";
import { withEnhancedRoleAuth } from "@/lib/api-auth-guard";
import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { governanceService } from "@/services/governance-service";
import type { NewCouncilElection } from "@/db/schema/governance-schema";

const listElectionsSchema = z.object({
  limit: z.string().optional().transform(value => (value ? parseInt(value, 10) : 25)),
});

const electionSchema = z.object({
  electionYear: z.number().int(),
  electionDate: z.string().date(),
  positionsAvailable: z.number().int().min(1),
  candidates: z.array(z.record(z.unknown())),
  winners: z.array(z.record(z.unknown())),
  totalVotes: z.number().int().min(0),
  participationRate: z.number().int().min(0).max(100).optional(),
  verifiedBy: z.string().optional(),
  verificationDate: z.string().date().optional(),
  contestedResults: z.boolean().optional(),
});

export const GET = async (request: NextRequest) =>
  withEnhancedRoleAuth(10, async (_request, context) => {
    const { userId } = context;
    const parsed = listElectionsSchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams)
    );

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request parameters" }, { status: 400 });
    }

    try {
      const { limit } = parsed.data;
      const records = await db
        .select()
        .from(councilElections)
        .orderBy(desc(councilElections.electionYear))
        .limit(limit || 25);

      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: "/api/governance/council-elections",
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
        endpoint: "/api/governance/council-elections",
        method: "GET",
        eventType: "auth_failed",
        severity: "high",
        details: { error: error instanceof Error ? error.message : "Unknown error" },
      });

      return NextResponse.json({ error: "Failed to fetch council elections" }, { status: 500 });
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

    const parsed = electionSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    try {
      const body = parsed.data;
      const electionInput: NewCouncilElection = {
        electionYear: body.electionYear,
        electionDate: new Date(body.electionDate),
        positionsAvailable: body.positionsAvailable,
        candidates: body.candidates,
        winners: body.winners,
        totalVotes: body.totalVotes,
        participationRate: body.participationRate,
        verifiedBy: body.verifiedBy,
        verificationDate: body.verificationDate ? new Date(body.verificationDate) : undefined,
        contestedResults: body.contestedResults ?? false,
      };

      const election = await governanceService.conductCouncilElection(electionInput);

      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: "/api/governance/council-elections",
        method: "POST",
        eventType: "success",
        severity: "high",
        details: { electionId: election.id, electionYear: body.electionYear },
      });

      return NextResponse.json({ success: true, data: election }, { status: 201 });
    } catch (error) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: "/api/governance/council-elections",
        method: "POST",
        eventType: "auth_failed",
        severity: "high",
        details: { error: error instanceof Error ? error.message : "Unknown error" },
      });

      return NextResponse.json({ error: "Failed to create council election" }, { status: 500 });
    }
  })(request, {});

