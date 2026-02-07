/**
 * Excel Export API
 * 
 * POST /api/exports/excel - Generate Excel export from report data
 */

import { NextRequest, NextResponse } from 'next/server';
import { withTenantAuth } from '@/lib/tenant-middleware';
import { createExportJob, updateExportJobStatus } from '@/db/queries/analytics-queries';
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";

async function postHandler(req: NextRequest, context) {
  try {
    const tenantId = context.tenantId;
    const userId = context.userId;
    
    if (!tenantId || !userId) {
      return NextResponse.json(
        { error: 'Tenant ID and User ID required' },
        { status: 400 }
      );
    }

    const body = await req.json();
    
    if (!body.reportId) {
      return NextResponse.json(
        { error: 'Report ID required' },
        { status: 400 }
      );
    }

    // Create export job
    const job = await createExportJob(tenantId, userId, {
      reportId: body.reportId,
      exportType: 'excel',
    });

    // Update status to processing
    await updateExportJobStatus(job.id, 'processing');

    return NextResponse.json({
      jobId: job.id,
      status: 'processing',
      message: 'Excel export job created. Poll /api/exports/[id] for status.',
    }, { status: 202 });
  } catch (error) {
    console.error('Excel export error:', error);
    return NextResponse.json(
      { error: 'Failed to create Excel export' },
      { status: 500 }
    );
  }
}

export const POST = withTenantAuth(postHandler);
