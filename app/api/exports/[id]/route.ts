/**
 * Export Job Status API
 * 
 * GET /api/exports/[id] - Get export job status and download URL
 */

import { NextRequest, NextResponse } from 'next/server';
import { withOrganizationAuth } from '@/lib/organization-middleware';
import { getExportJob } from '@/db/queries/analytics-queries';

async function getHandler(
  req: NextRequest,
  context: { tenantId: string; userId: string },
  params?: { id: string }
) {
  try {
    if (!params?.id) {
      return NextResponse.json(
        { error: 'Export ID required' },
        { status: 400 }
      );
    }

    const job = await getExportJob(params.id);

    if (!job || job.tenant_id !== context.organizationId) {
      return NextResponse.json(
        { error: 'Export job not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      job: {
        id: job.id,
        reportId: job.report_id,
        exportType: job.export_type,
        status: job.status,
        fileName: job.file_name,
        fileUrl: job.file_url,
        fileSize: job.file_size_bytes,
        rowCount: job.row_count,
        errorMessage: job.error_message,
        createdAt: job.created_at,
        expiresAt: job.expires_at,
      },
    });
  } catch (error) {
return NextResponse.json(
      { error: 'Failed to fetch export job' },
      { status: 500 }
    );
  }
}

export const GET = withOrganizationAuth(getHandler);
