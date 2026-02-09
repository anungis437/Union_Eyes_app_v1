import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withEnhancedRoleAuth } from "@/lib/api-auth-guard";
import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { governanceService } from "@/services/governance-service";

const councilMemberSchema = z.object({
  name: z.string().min(1),
  union: z.string().min(1),
  termStart: z.string().min(1),
  termEnd: z.string().min(1),
  electedDate: z.string().min(1),
});

const issueGoldenShareSchema = z.object({
  certificateNumber: z.string().min(3).max(100),
  issueDate: z.string().min(1),
  councilMembers: z.array(councilMemberSchema).min(2),
});

export const GET = async (request: NextRequest) =>
  withEnhancedRoleAuth(10, async (_request, context) => {
    const { userId } = context;

    try {
      const data = await governanceService.checkGoldenShareStatus();

      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: "/api/governance/golden-share",
        method: "GET",
        eventType: "success",
        severity: "low",
        details: { hasShare: Boolean(data?.share) },
      });

      return NextResponse.json({ success: true, data });
    } catch (error) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: "/api/governance/golden-share",
        method: "GET",
        eventType: "auth_failed",
        severity: "high",
        details: { error: error instanceof Error ? error.message : "Unknown error" },
      });

      return NextResponse.json({ error: "Failed to fetch golden share" }, { status: 500 });
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

    const parsed = issueGoldenShareSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    try {
      const body = parsed.data;
      const share = await governanceService.issueGoldenShare({
        certificateNumber: body.certificateNumber,
        issueDate: new Date(body.issueDate),
        councilMembers: body.councilMembers.map(member => ({
          name: member.name,
          union: member.union,
          termStart: new Date(member.termStart),
          termEnd: new Date(member.termEnd),
          electedDate: new Date(member.electedDate),
        })),
      });

      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: "/api/governance/golden-share",
        method: "POST",
        eventType: "success",
        severity: "high",
        details: { shareId: share.id },
      });

      return NextResponse.json({ success: true, data: share }, { status: 201 });
    } catch (error) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: "/api/governance/golden-share",
        method: "POST",
        eventType: "auth_failed",
        severity: "high",
        details: { error: error instanceof Error ? error.message : "Unknown error" },
      });

      return NextResponse.json({ error: "Failed to issue golden share" }, { status: 500 });
    }
  })(request, {});
