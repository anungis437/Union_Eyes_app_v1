/**
 * Report Run API
 * 
 * POST /api/reports/[id]/run - Execute report and return data
 */

import { NextRequest, NextResponse } from 'next/server';
import { withTenantAuth } from '@/lib/tenant-middleware';
import { sql } from '@/lib/db';
import { updateReportRunStats } from '@/db/queries/analytics-queries';

async function postHandler(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenantId = req.headers.get('x-tenant-id');
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID required' },
        { status: 400 }
      );
    }

    // Get report config
    const report = await sql`
      SELECT * FROM reports 
      WHERE id = ${params.id} AND tenant_id = ${tenantId}
    `;

    if (!report || report.length === 0) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    const reportConfig = report[0].config;
    const body = await req.json();
    const { parameters } = body || {};

    // Build dynamic query based on report config
    // This is a simplified version - real implementation would be more robust
    let query: any;
    
    if (reportConfig.query) {
      // Execute custom SQL query (with proper sanitization in production)
      query = await sql.unsafe(reportConfig.query);
    } else if (reportConfig.dataSource === 'claims') {
      // Pre-built queries for claims
      query = await sql`
        SELECT * FROM claims
        WHERE tenant_id = ${tenantId}
        LIMIT 1000
      `;
    } else if (reportConfig.dataSource === 'members') {
      query = await sql`
        SELECT * FROM organization_members
        WHERE tenant_id = ${tenantId}
        LIMIT 1000
      `;
    } else {
      return NextResponse.json(
        { error: 'Invalid report configuration' },
        { status: 400 }
      );
    }

    // Update run statistics
    await updateReportRunStats(params.id);

    return NextResponse.json({
      report: report[0],
      data: query,
      rowCount: query.length,
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
