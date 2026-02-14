/**
 * Export Job Status API
 * 
 * GET /api/exports/[id] - Get export job status and download URL
 */

import { NextRequest, NextResponse } from 'next/server';
import { withOrganizationAuth } from '@/lib/organization-middleware';
import { getExportJob } from '@/db/queries/analytics-queries';

import { standardSuccessResponse } from '@/lib/api/standardized-responses';
async function getHandler(
  req: NextRequest,
  context: { organizationId: string; userId: string },
  params?: { id: string }
) {
  try {
    if (!params?.id) {
      return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Export ID required'
    );
    }

    const job = await getExportJob(params.id);

    if (!job || job.organization_id !== context.organizationId) {
      return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Export job not found'
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
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch export job',
      error
    );
  }
}

export const GET = withOrganizationAuth(getHandler);
