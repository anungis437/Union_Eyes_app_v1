/**
 * Report Execution API
 * 
 * POST /api/reports/[id]/execute - Execute a report configuration
 * 
 * Created: December 5, 2025
 * Part of: Phase 2 - Enhanced Analytics & Reports
 */

import { NextRequest, NextResponse } from 'next/server';
import { withTenantAuth } from '@/lib/tenant-middleware';
import { getReportById, logReportExecution } from '@/db/queries/analytics-queries';
import { ReportExecutor } from '@/lib/report-executor';
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";

async function postHandler(
  req: NextRequest,
  context: any,
  params?: any
) {
  // Extract params from context or params argument
  const reportId = params?.id || context?.params?.id;
  try {
    const tenantId = context.tenantId;
    const userId = context.userId;
    const organizationId = req.headers.get('x-organization-id');
  if (organizationId && organizationId !== context.organizationId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

    
    if (!tenantId || !userId || !organizationId) {
      return NextResponse.json(
        { error: 'Tenant ID, User ID, and Organization ID required' },
        { status: 400 }
      );
    }

    // Get report configuration
    const report = await getReportById(reportId, tenantId);

    if (!report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    // Check permissions (user must be creator, or report must be public/shared)
    const hasAccess = 
      report.created_by === userId ||
      report.is_public ||
      await checkReportAccess(reportId, userId);

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
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
    const executor = new ReportExecutor(organizationId, tenantId);
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
    console.error('Report execution error:', error);
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

export const POST = withTenantAuth(postHandler);
