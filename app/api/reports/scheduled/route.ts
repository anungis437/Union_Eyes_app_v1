/**
 * Scheduled Reports API - List and Create
 * 
 * GET  /api/reports/scheduled - List all scheduled reports
 * POST /api/reports/scheduled - Create a new scheduled report
 * 
 * Part of: Phase 2.4 - Scheduled Reports System
 * GUARDED: withOrganizationAuth (existing guard is acceptable)
 */

import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { withOrganizationAuth, OrganizationContext } from '@/lib/organization-middleware';
import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
import {
  getScheduledReports,
  createScheduledReport,
  type CreateScheduledReportParams,
} from '@/db/queries/scheduled-reports-queries';

/**
 * GET /api/reports/scheduled
 * List all scheduled reports for the tenant
 * 
 * GUARDED: withOrganizationAuth
 */
async function getHandler(req: NextRequest, context: OrganizationContext) {
  try {
    const { organizationId } = context;

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const reportId = searchParams.get('reportId') || undefined;
    const isActive = searchParams.get('isActive');
    const scheduleType = searchParams.get('scheduleType') || undefined;

    // Build filters
    const filters: any = {};
    if (reportId) filters.reportId = reportId;
    if (isActive !== null) filters.isActive = isActive === 'true';
    if (scheduleType) filters.scheduleType = scheduleType;

    // Get scheduled reports
    const schedules = await getScheduledReports(tenantId, filters);

    return NextResponse.json({
      schedules,
      count: schedules.length,
    });
  } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch scheduled reports',
      error
    );
  }
}

/**
 * POST /api/reports/scheduled
 * Create a new scheduled report
 */
async function postHandler(req: NextRequest, context: OrganizationContext) {
  try {
    const { organizationId } = context;

    const body = await req.json();

    // Validate required fields
    if (!body.reportId) {
      return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Report ID is required'
    );
    }

    if (!body.scheduleType) {
      return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Schedule type is required'
    );
    }

    if (!body.deliveryMethod) {
      return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Delivery method is required'
    );
    }

    if (!body.recipients || body.recipients.length === 0) {
      return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'At least one recipient is required'
    );
    }

    if (!body.exportFormat) {
      return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Export format is required'
    );
    }

    // Create the scheduled report
    const params: CreateScheduledReportParams = {
      reportId: body.reportId,
      scheduleType: body.scheduleType,
      scheduleConfig: body.scheduleConfig || {},
      deliveryMethod: body.deliveryMethod,
      recipients: body.recipients,
      exportFormat: body.exportFormat,
      isActive: body.isActive ?? true,
    };

    const schedule = await createScheduledReport(tenantId, params);

    return NextResponse.json(schedule, { status: 201 });
  } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to create scheduled report',
      error
    );
  }
}

export const GET = withOrganizationAuth(getHandler);

const reportsScheduledSchema = z.object({
  reportId: z.string().uuid('Invalid reportId'),
  scheduleType: z.unknown().optional(),
  deliveryMethod: z.unknown().optional(),
  recipients: z.unknown().optional(),
  exportFormat: z.unknown().optional(),
  scheduleConfig: z.unknown().optional(),
  isActive: z.boolean().optional(),
});


export const POST = withOrganizationAuth(postHandler);

