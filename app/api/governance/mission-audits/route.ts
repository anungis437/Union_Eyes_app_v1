import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { desc } from "drizzle-orm";
import { db } from "@/db/db";
import { missionAudits } from "@/db/schema/domains/governance";
import { withEnhancedRoleAuth } from "@/lib/api-auth-guard";
import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { governanceService } from "@/services/governance-service";
import type { NewMissionAudit } from "@/db/schema/domains/governance";

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
const listAuditsSchema = z.object({
  limit: z.string().optional().transform(value => (value ? parseInt(value, 10) : 25)),
});

const createAuditSchema = z.object({
  auditYear: z.number().int(),
  auditPeriodStart: z.string().date(),
  auditPeriodEnd: z.string().date(),
  auditorFirm: z.string().min(2),
  auditorName: z.string().min(2),
  auditorCertification: z.string().optional(),
  auditDate: z.string().date(),
  unionRevenuePercent: z.number().int().min(0).max(100),
  memberSatisfactionPercent: z.number().int().min(0).max(100),
  dataViolations: z.number().int().min(0),
  totalRevenue: z.number().int().optional(),
  unionRevenue: z.number().int().optional(),
  memberSurveySampleSize: z.number().int().optional(),
  memberSurveyResponses: z.number().int().optional(),
  dataViolationDetails: z.array(z.record(z.unknown())).optional(),
  auditorOpinion: z.string().min(2),
  auditorNotes: z.string().optional(),
  correctiveActions: z.array(z.record(z.unknown())).optional(),
  auditReportPdfUrl: z.string().url().optional(),
  supportingDocumentsUrls: z.array(z.string().url()).optional(),
});

export const GET = async (request: NextRequest) =>
  withEnhancedRoleAuth(10, async (_request, context) => {
    const { userId } = context;
    const parsed = listAuditsSchema.safeParse(
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
      const records = await db
        .select()
        .from(missionAudits)
        .orderBy(desc(missionAudits.auditYear))
        .limit(limit || 25);

      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: "/api/governance/mission-audits",
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
        endpoint: "/api/governance/mission-audits",
        method: "GET",
        eventType: "auth_failed",
        severity: "high",
        details: { error: error instanceof Error ? error.message : "Unknown error" },
      });

      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch mission audits',
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
    } catch {
      return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid JSON in request body',
      error
    );
    }

    const parsed = createAuditSchema.safeParse(rawBody);
    if (!parsed.success) {
      return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid request body',
      error
    );
    }

    try {
      const body = parsed.data;
      const auditInput: NewMissionAudit = {
        auditYear: body.auditYear,
        auditPeriodStart: new Date(body.auditPeriodStart),
        auditPeriodEnd: new Date(body.auditPeriodEnd),
        auditorFirm: body.auditorFirm,
        auditorName: body.auditorName,
        auditorCertification: body.auditorCertification,
        auditDate: new Date(body.auditDate),
        unionRevenuePercent: body.unionRevenuePercent,
        memberSatisfactionPercent: body.memberSatisfactionPercent,
        dataViolations: body.dataViolations,
        totalRevenue: body.totalRevenue,
        unionRevenue: body.unionRevenue,
        memberSurveySampleSize: body.memberSurveySampleSize,
        memberSurveyResponses: body.memberSurveyResponses,
        dataViolationDetails: body.dataViolationDetails,
        auditorOpinion: body.auditorOpinion,
        auditorNotes: body.auditorNotes,
        correctiveActions: body.correctiveActions,
        auditReportPdfUrl: body.auditReportPdfUrl,
        supportingDocumentsUrls: body.supportingDocumentsUrls,
      };

      const audit = await governanceService.conductMissionAudit(auditInput);

      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: "/api/governance/mission-audits",
        method: "POST",
        eventType: "success",
        severity: "high",
        details: { auditYear: body.auditYear, auditId: audit.id },
      });

      return standardSuccessResponse(
      { data: audit },
      undefined,
      201
    );
    } catch (error) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: "/api/governance/mission-audits",
        method: "POST",
        eventType: "auth_failed",
        severity: "high",
        details: { error: error instanceof Error ? error.message : "Unknown error" },
      });

      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to create mission audit',
      error
    );
    }
  })(request, {});

