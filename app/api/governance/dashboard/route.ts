import { NextRequest, NextResponse } from "next/server";
import { withEnhancedRoleAuth } from "@/lib/api-auth-guard";
import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { governanceService } from "@/services/governance-service";

export const GET = async (request: NextRequest) =>
  withEnhancedRoleAuth(10, async (_request, context) => {
    const { userId } = context;

    try {
      const data = await governanceService.getGovernanceDashboard();

      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: "/api/governance/dashboard",
        method: "GET",
        eventType: "success",
        severity: "low",
        details: { pendingVotes: data.pendingVotes?.length || 0 },
      });

      return NextResponse.json({ success: true, data });
    } catch (error) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: "/api/governance/dashboard",
        method: "GET",
        eventType: "auth_failed",
        severity: "high",
        details: { error: error instanceof Error ? error.message : "Unknown error" },
      });

      return NextResponse.json({ error: "Failed to load governance dashboard" }, { status: 500 });
    }
  })(request, {});

