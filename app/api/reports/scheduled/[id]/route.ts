/**
 * Scheduled Reports API - Individual Schedule Operations
 * 
 * GET    /api/reports/scheduled/[id] - Get a single scheduled report
 * PATCH  /api/reports/scheduled/[id] - Update a scheduled report
 * DELETE /api/reports/scheduled/[id] - Delete a scheduled report
 * 
 * Part of: Phase 2.4 - Scheduled Reports System
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
  getScheduledReportById,
  updateScheduledReport,
  deleteScheduledReport,
  pauseSchedule,
  resumeSchedule,
  getScheduleExecutionHistory,
  type UpdateScheduledReportParams,
} from '@/db/queries/scheduled-reports-queries';

interface RouteParams {
  id: string;
}

/**
 * GET /api/reports/scheduled/[id]
 * Get a single scheduled report
 */
async function getHandler(req: NextRequest, context: OrganizationContext, params?: RouteParams) {
  try {
    const { organizationId } = context;

    if (!params?.id) {
      return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Schedule ID is required'
    );
    }

    const schedule = await getScheduledReportById(params.id, tenantId);

    if (!schedule) {
      return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Scheduled report not found'
    );
    }

    // Optionally include execution history
    const { searchParams } = new URL(req.url);
    const includeHistory = searchParams.get('includeHistory') === 'true';

    if (includeHistory) {
      const history = await getScheduleExecutionHistory(params.id, tenantId, 20);
      return NextResponse.json({
        ...schedule,
        executionHistory: history,
      });
    }

    return NextResponse.json(schedule);
  } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch scheduled report',
      error
    );
  }
}

/**
 * PATCH /api/reports/scheduled/[id]
 * Update a scheduled report
 */
async function patchHandler(req: NextRequest, context: OrganizationContext, params?: RouteParams) {
  try {
    const { organizationId } = context;

    if (!params?.id) {
      return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Schedule ID is required'
    );
    }

    const body = await req.json();

    // Handle special actions
    if (body.action === 'pause') {
      await pauseSchedule(params.id, tenantId);
      const schedule = await getScheduledReportById(params.id, tenantId);
      return NextResponse.json(schedule);
    }

    if (body.action === 'resume') {
      await resumeSchedule(params.id, tenantId);
      const schedule = await getScheduledReportById(params.id, tenantId);
      return NextResponse.json(schedule);
    }

    // Regular update
    const updateParams: UpdateScheduledReportParams = {};
    
    if (body.scheduleType !== undefined) {
      updateParams.scheduleType = body.scheduleType;
    }
    if (body.scheduleConfig !== undefined) {
      updateParams.scheduleConfig = body.scheduleConfig;
    }
    if (body.deliveryMethod !== undefined) {
      updateParams.deliveryMethod = body.deliveryMethod;
    }
    if (body.recipients !== undefined) {
      updateParams.recipients = body.recipients;
    }
    if (body.exportFormat !== undefined) {
      updateParams.exportFormat = body.exportFormat;
    }
    if (body.isActive !== undefined) {
      updateParams.isActive = body.isActive;
    }

    const schedule = await updateScheduledReport(params.id, tenantId, updateParams);

    return NextResponse.json(schedule);
  } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to update scheduled report',
      error
    );
  }
}

/**
 * DELETE /api/reports/scheduled/[id]
 * Delete a scheduled report
 */
async function deleteHandler(req: NextRequest, context: OrganizationContext, params?: RouteParams) {
  try {
    const { organizationId } = context;

    if (!params?.id) {
      return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Schedule ID is required'
    );
    }

    await deleteScheduledReport(params.id, tenantId);

    return NextResponse.json({ success: true });
  } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to delete scheduled report',
      error
    );
  }
}

export const GET = withOrganizationAuth(getHandler);

const reportsScheduledSchema = z.object({
  action: z.unknown().optional(),
  scheduleType: z.unknown().optional(),
  scheduleConfig: z.unknown().optional(),
  deliveryMethod: z.unknown().optional(),
  recipients: z.unknown().optional(),
  exportFormat: z.unknown().optional(),
  isActive: z.boolean().optional(),
});


export const PATCH = withOrganizationAuth(patchHandler);
export const DELETE = withOrganizationAuth(deleteHandler);
