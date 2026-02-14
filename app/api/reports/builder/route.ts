import { z } from 'zod';
import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * Report Builder API
 * 
 * POST /api/reports/builder - Save report configuration
 * Stores custom report definitions for later execution
 * 
 * Created: November 16, 2025
 * Part of: Area 8 - Analytics Platform
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { reports } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { withApiAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';

import { standardSuccessResponse } from '@/lib/api/standardized-responses';

const reportsBuilderSchema = z.object({
  name: z.string().min(1, 'name is required'),
  config: z.unknown().optional(),
  description: z.string().optional(),
  category: z.unknown().optional(),
  isPublic: z.boolean().optional(),
  isTemplate: z.boolean().optional(),
  templateId: z.string().uuid('Invalid templateId'),
});


export const POST = async (req: NextRequest) => {
  return withRoleAuth(50, async (request, context) => {
    const { userId, organizationId } = context;

    // Rate limit report builder operations
    const rateLimitResult = await checkRateLimit(
      RATE_LIMITS.REPORT_BUILDER,
      `report-builder-create:${userId}`
    );

    if (!rateLimitResult.allowed) {
      return standardErrorResponse(
      ErrorCode.RATE_LIMIT_EXCEEDED,
      'Rate limit exceeded',
      { resetIn: rateLimitResult.resetIn }
    );
    }

  try {

      if (!userId || !organizationId) {
        return standardErrorResponse(
      ErrorCode.AUTH_REQUIRED,
      'Unauthorized'
    );
      }

      const body = await req.json();

      // Validate required fields
      if (!body.name || !body.config) {
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Report name and configuration are required'
    );
      }

      // Validate config structure
      const config = body.config;
      if (!config.dataSourceId || !config.fields || config.fields.length === 0) {
        return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid report configuration: missing data source or fields'
    );
      }

      // Create report
      const [report] = await db
        .insert(reports)
        .values({
          organizationId,
          name: body.name,
          description: body.description || null,
          reportType: 'custom',
          category: body.category || 'custom',
          config: config,
          isPublic: body.isPublic || false,
          isTemplate: body.isTemplate || false,
          templateId: body.templateId || null,
          createdBy: userId,
        })
        .returning();

      // Log audit event
      await logApiAuditEvent({
        userId,
        organizationId,
        action: 'report_create',
        resourceType: 'report',
        resourceId: report.id,
        metadata: { reportType: 'custom', category: body.category },
        dataType: 'ANALYTICS',
      });

      return NextResponse.json({
        success: true,
        report: {
          id: report.id,
          name: report.name,
          description: report.description,
          reportType: report.reportType,
          category: report.category,
          createdAt: report.createdAt,
        },
      });
    } catch (error: Record<string, unknown>) {
return NextResponse.json(
        { error: 'Failed to create report', details: error.message },
        { status: 500 }
      );
    }
    })(request);
};

export const GET = async (req: NextRequest) => {
  return withRoleAuth(50, async (request, context) => {
    const { userId, organizationId } = context;

  try {

      if (!userId || !organizationId) {
        return standardErrorResponse(
      ErrorCode.AUTH_REQUIRED,
      'Unauthorized'
    );
      }

      // Get all custom reports for this organization
      const customReports = await db
        .select()
        .from(reports)
        .where(eq(reports.organizationId, organizationId))
        .orderBy(reports.createdAt);

      return NextResponse.json({
        reports: customReports.map(report => ({
          id: report.id,
          name: report.name,
          description: report.description,
          reportType: report.reportType,
          category: report.category,
          isPublic: report.isPublic,
          isTemplate: report.isTemplate,
          createdAt: report.createdAt,
          lastRunAt: report.lastRunAt,
          runCount: report.runCount,
        })),
      });
    } catch (error: Record<string, unknown>) {
return NextResponse.json(
        { error: 'Failed to fetch reports', details: error.message },
        { status: 500 }
      );
    }
    })(request);
};

