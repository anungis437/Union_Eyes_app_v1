/**
 * Report Run API
 * 
 * POST /api/reports/[id]/run - Execute report and return data
 */

import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { withOrganizationAuth, OrganizationContext } from '@/lib/organization-middleware';
import { db } from '@/db';
import { sql } from '@/db';
import { updateReportRunStats } from '@/db/queries/analytics-queries';

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
async function postHandler(
  req: NextRequest,
  context: OrganizationContext,
  params?: { id: string }
) {
  try {
    if (!params?.id) {
      return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Report ID required'
    );
    }

    // Get report config
    const reportResult = await db.execute(sql`
      SELECT * FROM reports 
      WHERE id = ${params.id} AND tenant_id = ${context.organizationId}
    `);

    if (!reportResult || reportResult.length === 0) {
      return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Report not found'
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
      return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid report configuration - only predefined data sources are allowed'
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
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to run report',
      error
    );
  }
}


const reportsRunSchema = z.object({
  parameters: z.unknown().optional(),
});


export const POST = withOrganizationAuth(postHandler);
