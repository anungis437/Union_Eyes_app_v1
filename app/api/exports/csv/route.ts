/**
 * CSV Export API
 * 
 * POST /api/exports/csv - Generate CSV export from report data
 */

import { NextRequest, NextResponse } from 'next/server';
import { withTenantAuth } from '@/lib/tenant-middleware';
import { createExportJob, updateExportJobStatus } from '@/db/queries/analytics-queries';

async function postHandler(req: NextRequest) {
  try {
    const tenantId = req.headers.get('x-tenant-id');
    const userId = req.headers.get('x-user-id');
    
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
      exportType: 'csv',
    });

    // Update status to processing
    await updateExportJobStatus(job.id, 'processing');

    return NextResponse.json({
      jobId: job.id,
      status: 'processing',
      message: 'CSV export job created. Poll /api/exports/[id] for status.',
    }, { status: 202 });
  } catch (error) {
    console.error('CSV export error:', error);
    return NextResponse.json(
      { error: 'Failed to create CSV export' },
      { status: 500 }
    );
  }
}

export const POST = withTenantAuth(postHandler);
