/**
 * Report Run API
 * 
 * POST /api/reports/[id]/run - Execute report and return data
 */

import { NextRequest, NextResponse } from 'next/server';
import { withOrganizationAuth, OrganizationContext } from '@/lib/organization-middleware';
import { db } from '@/db';
import { sql } from '@/db';
import { updateReportRunStats } from '@/db/queries/analytics-queries';

async function postHandler(
  req: NextRequest,
  context: OrganizationContext,
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
      WHERE id = ${params.id} AND tenant_id = ${context.organizationId}
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

    // SECURITY: Only execute pre-built queries from allowlisted data sources
    // Custom SQL execution has been removed to prevent SQL injection
    let queryResult: any;
    
    if (reportConfig.dataSource === 'claims') {
      // Pre-built queries for claims
      queryResult = await db.execute(sql`
        SELECT * FROM claims
        WHERE tenant_id = ${context.organizationId}
        LIMIT 1000
      `);
    } else if (reportConfig.dataSource === 'members') {
      queryResult = await db.execute(sql`
        SELECT * FROM organization_members
        WHERE tenant_id = ${context.organizationId}
        LIMIT 1000
      `);
    } else if (reportConfig.dataSource === 'deadlines') {
      queryResult = await db.execute(sql`
        SELECT * FROM deadlines
        WHERE tenant_id = ${context.organizationId}
        LIMIT 1000
      `);
    } else if (reportConfig.dataSource === 'grievances') {
      queryResult = await db.execute(sql`
        SELECT * FROM grievances
        WHERE tenant_id = ${context.organizationId}
        LIMIT 1000
      `);
    } else {
      return NextResponse.json(
        { error: 'Invalid report configuration - only predefined data sources are allowed' },
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
return NextResponse.json(
      { error: 'Failed to run report' },
      { status: 500 }
    );
  }
}

export const POST = withOrganizationAuth(postHandler);
