/**
 * CSV Export API
 * 
 * POST /api/exports/csv - Generate CSV export from report data
 */

import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { withOrganizationAuth } from '@/lib/organization-middleware';
import { createExportJob, updateExportJobStatus } from '@/db/queries/analytics-queries';
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
async function postHandler(req: NextRequest, context) {
  try {
    const organizationId = context.organizationId;
    const tenantId = organizationId;
    const userId = context.userId;
    
    if (!tenantId || !userId) {
      return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Tenant ID and User ID required'
    );
    }

    const body = await req.json();
    
    if (!body.reportId) {
      return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Report ID required'
    );
    }

    // Create export job
    const job = await createExportJob(tenantId, userId, {
      reportId: body.reportId,
      exportType: 'csv',
    });

    // Update status to processing
    await updateExportJobStatus(job.id, 'processing');

    return standardSuccessResponse(
      { 
      jobId: job.id,
      status: 'processing',
      message: 'CSV export job created. Poll /api/exports/[id] for status.',
     },
      undefined,
      202
    );
  } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to create CSV export',
      error
    );
  }
}


const exportsCsvSchema = z.object({
  reportId: z.string().uuid('Invalid reportId'),
});


export const POST = withApiAuth(postHandler);

