/**
 * PDF Export API
 * 
 * POST /api/exports/pdf - Generate PDF export from report data
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
    const userId = context.userId;
    
    if (!organizationId || !userId) {
      return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Organization ID and User ID required'
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
    const job = await createExportJob(organizationId, userId, {
      reportId: body.reportId,
      exportType: 'pdf',
    });

    // Update status to processing
    await updateExportJobStatus(job.id, 'processing');

    // In production, this would trigger an async job
    // For now, return the job ID for polling
    // Real implementation would use background job queue (Bull/BullMQ)

    return standardSuccessResponse(
      { 
      jobId: job.id,
      status: 'processing',
      message: 'PDF export job created. Poll /api/exports/[id] for status.',
     },
      undefined,
      202
    );
  } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to create PDF export',
      error
    );
  }
}


const exportsPdfSchema = z.object({
  reportId: z.string().uuid('Invalid reportId'),
});


export const POST = withApiAuth(postHandler);

