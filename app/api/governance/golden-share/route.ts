import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withEnhancedRoleAuth } from "@/lib/api-auth-guard";
import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { governanceService } from "@/services/governance-service";

import { standardSuccessResponse } from '@/lib/api/standardized-responses';
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

      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch golden share',
      error
    );
    }
  })(request, {});

export const POST = async (request: NextRequest) =>
  withEnhancedRoleAuth(20, async (_request, context) => {
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

    const parsed = issueGoldenShareSchema.safeParse(rawBody);
    if (!parsed.success) {
      return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid request body',
      parsed.error
    );
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

      return standardSuccessResponse({ data: share });
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

      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to issue golden share',
      error
    );
    }
  })(request, {});

