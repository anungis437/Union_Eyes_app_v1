/**
 * User Export Jobs API
 * 
 * GET /api/exports - Get all export jobs for current user
 */

import { NextRequest, NextResponse } from 'next/server';
import { withOrganizationAuth } from '@/lib/organization-middleware';
import { getUserExportJobs } from '@/db/queries/analytics-queries';
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';

async function getHandler(req: NextRequest, context) {
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

    const jobs = await getUserExportJobs(tenantId, userId);

    return NextResponse.json({
      jobs: jobs.map(job => ({
        id: job.id,
        reportId: job.report_id,
        reportName: job.report_name,
        exportType: job.export_type,
        status: job.status,
        fileName: job.file_name,
        fileUrl: job.file_url,
        fileSize: job.file_size_bytes,
        createdAt: job.created_at,
        expiresAt: job.expires_at,
      })),
    });
  } catch (error) {
    console.error('Get user export jobs error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch export jobs' },
      { status: 500 }
    );
  }
}

export const GET = withApiAuth(getHandler);
