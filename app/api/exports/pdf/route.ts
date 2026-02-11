/**
 * PDF Export API
 * 
 * POST /api/exports/pdf - Generate PDF export from report data
 */

import { NextRequest, NextResponse } from 'next/server';
import { withOrganizationAuth } from '@/lib/organization-middleware';
import { createExportJob, updateExportJobStatus } from '@/db/queries/analytics-queries';
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';

async function postHandler(req: NextRequest, context) {
  try {
    const organizationId = context.organizationId;
    const tenantId = organizationId;
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
      exportType: 'pdf',
    });

    // Update status to processing
    await updateExportJobStatus(job.id, 'processing');

    // In production, this would trigger an async job
    // For now, return the job ID for polling
    // Real implementation would use background job queue (Bull/BullMQ)

    return NextResponse.json({
      jobId: job.id,
      status: 'processing',
      message: 'PDF export job created. Poll /api/exports/[id] for status.',
    }, { status: 202 });
  } catch (error) {
    console.error('PDF export error:', error);
    return NextResponse.json(
      { error: 'Failed to create PDF export' },
      { status: 500 }
    );
  }
}

export const POST = withApiAuth(postHandler);

