/**
 * Report Execution API
 * 
 * POST /api/reports/[id]/execute - Execute a report configuration
 * 
 * Created: December 5, 2025
 * Part of: Phase 2 - Enhanced Analytics & Reports
 */

import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { getReportById, logReportExecution } from '@/db/queries/analytics-queries';
import { ReportExecutor } from '@/lib/report-executor';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';
import { logApiAuditEvent } from '@/lib/middleware/request-validation';

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
async function postHandler(
  req: NextRequest,
  context: any,
  params?: any
) {
  // Extract params from context or params argument
  const reportId = params?.id || context?.params?.id;
  const { userId, organizationId } = context;

  // Rate limit report execution
  const rateLimitResult = await checkRateLimit(
    RATE_LIMITS.REPORT_EXECUTION,
    `report-execute:${userId}`
  );

  if (!rateLimitResult.allowed) {
    return standardErrorResponse(
      ErrorCode.RATE_LIMIT_EXCEEDED,
      'Rate limit exceeded'
      // TODO: Migrate additional details: resetIn: rateLimitResult.resetIn
    );
  }

  try {
    const organizationId = context.organizationId;
    const tenantId = organizationId;
    const userId = context.userId;
    const headerOrganizationId = req.headers.get('x-organization-id');
    const effectiveOrganizationId = headerOrganizationId ?? organizationId;
    if (headerOrganizationId && headerOrganizationId !== organizationId) {
      return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Forbidden'
    );
    }

    
    if (!tenantId || !userId || !effectiveOrganizationId) {
      return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Tenant ID, User ID, and Organization ID required'
      // TODO: Migrate additional details: User ID, and Organization ID required'
    );
    }

    // Get report configuration
    const report = await getReportById(reportId, tenantId);

    if (!report) {
      return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Report not found'
    );
    }

    // Check permissions (user must be creator, or report must be public/shared)
    const hasAccess = 
      report.created_by === userId ||
      report.is_public ||
      await checkReportAccess(reportId, userId);

    if (!hasAccess) {
      return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Access denied'
    );
    }

    // Parse request body for runtime parameters
    const body = await req.json().catch(() => ({}));
    const parameters = body.parameters || {};

    // Merge saved config with runtime parameters
    const config = {
      ...report.config,
      ...parameters,
    };

    // Execute report
    const executor = new ReportExecutor(effectiveOrganizationId, tenantId);
    const result = await executor.execute(config);

    // Log execution
    await logReportExecution(reportId, tenantId, userId, {
      format: parameters.format || 'json',
      parameters: parameters,
      resultCount: result.rowCount,
      executionTimeMs: result.executionTimeMs,
      status: result.success ? 'completed' : 'failed',
      errorMessage: result.error,
    });

    if (!result.success) {
      return NextResponse.json(
        { 
          error: result.error,
          executionTimeMs: result.executionTimeMs,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      rowCount: result.rowCount,
      executionTimeMs: result.executionTimeMs,
    });

  } catch (error: any) {
return NextResponse.json(
      { error: error.message || 'Failed to execute report' },
      { status: 500 }
    );
  }
}

/**
 * Check if user has access to report via sharing
 */
async function checkReportAccess(
  reportId: string,
  userId: string
): Promise<boolean> {
  const { db } = await import('@/db/db');
  const { sql } = await import('drizzle-orm');

  const shares = await db.execute(sql`
    SELECT 1 FROM report_shares
    WHERE report_id = ${reportId}
      AND shared_with = ${userId}
      AND (expires_at IS NULL OR expires_at > NOW())
    LIMIT 1
  `);

  return shares.length > 0;
}


const reportsExecuteSchema = z.object({
  parameters: z.unknown().optional(),
});


export const POST = withRoleAuth(40, postHandler);
