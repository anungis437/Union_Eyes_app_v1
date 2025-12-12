/**
 * Report Run API
 * 
 * POST /api/reports/[id]/run - Execute report and return data
 */

import { NextRequest, NextResponse } from 'next/server';
import { withTenantAuth, TenantContext } from '@/lib/tenant-middleware';
import { db } from '@/db';
import { sql } from '@/lib/db';
import { updateReportRunStats } from '@/db/queries/analytics-queries';

async function postHandler(
  req: NextRequest,
  context: TenantContext,
  params?: { id: string }
) {
  try {
    if (!params?.id) {
      return NextResponse.json(
        { error: 'Report ID required' },
        { status: 400 }
      );
    }

    // Get report config
    const reportResult = await db.execute(sql`
      SELECT * FROM reports 
      WHERE id = ${params.id} AND tenant_id = ${context.tenantId}
    `);

    if (!reportResult || reportResult.length === 0) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    const report = reportResult[0];
    const reportConfig = report.config as any;
    const body = await req.json();
    const { parameters } = body || {};

    // Build dynamic query based on report config
    // This is a simplified version - real implementation would be more robust
    let queryResult: any;
    
    if (reportConfig.query) {
      // Execute custom SQL query (with proper sanitization in production)
      queryResult = await db.execute(sql.raw(reportConfig.query));
    } else if (reportConfig.dataSource === 'claims') {
      // Pre-built queries for claims
      queryResult = await db.execute(sql`
        SELECT * FROM claims
        WHERE tenant_id = ${context.tenantId}
        LIMIT 1000
      `);
    } else if (reportConfig.dataSource === 'members') {
      queryResult = await db.execute(sql`
        SELECT * FROM organization_members
        WHERE tenant_id = ${context.tenantId}
        LIMIT 1000
      `);
    } else {
      return NextResponse.json(
        { error: 'Invalid report configuration' },
        { status: 400 }
      );
    }

    // Update run statistics
    await updateReportRunStats(params.id);

    return NextResponse.json({
      report: report,
      data: queryResult,
      rowCount: queryResult.length,
      executedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Run report error:', error);
    return NextResponse.json(
      { error: 'Failed to run report' },
      { status: 500 }
    );
  }
}

export const POST = withTenantAuth(postHandler);
