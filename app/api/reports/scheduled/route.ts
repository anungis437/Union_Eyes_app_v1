/**
 * Scheduled Reports API - List and Create
 * 
 * GET  /api/reports/scheduled - List all scheduled reports
 * POST /api/reports/scheduled - Create a new scheduled report
 * 
 * Part of: Phase 2.4 - Scheduled Reports System
 * GUARDED: withOrganizationAuth (existing guard is acceptable)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withOrganizationAuth, OrganizationContext } from '@/lib/organization-middleware';
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
    console.error('Error fetching scheduled reports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scheduled reports' },
      { status: 500 }
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
      return NextResponse.json(
        { error: 'Report ID is required' },
        { status: 400 }
      );
    }

    if (!body.scheduleType) {
      return NextResponse.json(
        { error: 'Schedule type is required' },
        { status: 400 }
      );
    }

    if (!body.deliveryMethod) {
      return NextResponse.json(
        { error: 'Delivery method is required' },
        { status: 400 }
      );
    }

    if (!body.recipients || body.recipients.length === 0) {
      return NextResponse.json(
        { error: 'At least one recipient is required' },
        { status: 400 }
      );
    }

    if (!body.exportFormat) {
      return NextResponse.json(
        { error: 'Export format is required' },
        { status: 400 }
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
    console.error('Error creating scheduled report:', error);
    return NextResponse.json(
      { error: 'Failed to create scheduled report' },
      { status: 500 }
    );
  }
}

export const GET = withOrganizationAuth(getHandler);
export const POST = withOrganizationAuth(postHandler);

