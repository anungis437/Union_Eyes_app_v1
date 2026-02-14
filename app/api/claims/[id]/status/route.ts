import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { updateClaimStatus, addClaimNote } from "@/lib/workflow-engine";
import { requireUser } from '@/lib/api-auth-guard';
import { withApiAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { logApiAuditEvent } from '@/lib/middleware/api-security';
import { checkRateLimit, RATE_LIMITS, createRateLimitHeaders } from '@/lib/rate-limiter';

import { standardSuccessResponse } from '@/lib/api/standardized-responses';

const updateClaimStatusSchema = z.object({
  status: z.string().min(1, 'Status is required'),
  notes: z.string().optional(),
  reason: z.string().optional(),
});
/**
 * PATCH /api/claims/[id]/status
 * Update claim status with workflow validation (Role level 60 required for approve/reject operations)
 */
export const PATCH = withRoleAuth('steward', async (request, context) => {
  const { userId, organizationId } = context;

  // Check rate limit for claims operations
  const rateLimitResult = await checkRateLimit(
    `claims-operations:${userId}`,
    RATE_LIMITS.CLAIMS_OPERATIONS
  );

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { 
        error: 'Rate limit exceeded. Please try again later.',
        resetIn: rateLimitResult.resetIn 
      },
      { 
        status: 429,
        headers: createRateLimitHeaders(rateLimitResult)
      }
    );
  }

  try {
    const claimNumber = params.id;
    const body = await request.json();
    
    // Validate request body
    const validation = updateClaimStatusSchema.safeParse(body);
    if (!validation.success) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: `/api/claims/${claimNumber}/status`,
        method: 'PATCH',
        eventType: 'validation_failed',
        severity: 'low',
        dataType: 'CLAIMS',
        details: { reason: 'Invalid request data', errors: validation.error.errors, claimNumber },
      });
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request data',
        validation.error.errors
      );
    }
    
    const { status: newStatus, notes } = validation.data;

    // Update status with workflow validation
    const result = await updateClaimStatus(claimNumber, newStatus, userId, notes);

    if (!result.success) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: `/api/claims/${claimNumber}/status`,
        method: 'PATCH',
        eventType: 'validation_failed',
        severity: 'medium',
        dataType: 'CLAIMS',
        details: { reason: result.error, claimNumber, attemptedStatus: newStatus, organizationId },
      });
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    logApiAuditEvent({
      timestamp: new Date().toISOString(),
      userId,
      endpoint: `/api/claims/${claimNumber}/status`,
      method: 'PATCH',
      eventType: 'success',
      severity: 'high',
      dataType: 'CLAIMS',
      details: { claimNumber, newStatus, organizationId },
    });

    return NextResponse.json({
      success: true,
      claim: result.claim,
      message: "Status updated successfully",
    });
  } catch (error) {
    logApiAuditEvent({
      timestamp: new Date().toISOString(),
      userId,
      endpoint: `/api/claims/${params.id}/status`,
      method: 'PATCH',
      eventType: 'server_error',
      severity: 'high',
      dataType: 'CLAIMS',
      details: { error: error instanceof Error ? error.message : 'Unknown error', organizationId },
    });
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to update status',
      error
    );
  }
}, { params });

/**
 * POST /api/claims/[id]/status/note
 * Add a note to the claim (Role level 30 required)
 */
export const POST = withRoleAuth(30, async (request, context) => {
  const { userId, organizationId } = context;

  try {
    const claimNumber = params.id;
    const body = await request.json();
    const { message, isInternal = true } = body;

    if (!message) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: `/api/claims/${claimNumber}/status`,
        method: 'POST',
        eventType: 'validation_failed',
        severity: 'low',
        dataType: 'CLAIMS',
        details: { reason: 'Message is required', claimNumber },
      });
      return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Message is required'
    );
    }

    const result = await addClaimNote(claimNumber, message, userId, isInternal);

    if (!result.success) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: `/api/claims/${claimNumber}/status`,
        method: 'POST',
        eventType: 'validation_failed',
        severity: 'medium',
        dataType: 'CLAIMS',
        details: { reason: result.error, claimNumber, organizationId },
      });
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    logApiAuditEvent({
      timestamp: new Date().toISOString(),
      userId,
      endpoint: `/api/claims/${claimNumber}/status`,
      method: 'POST',
      eventType: 'success',
      severity: 'medium',
      dataType: 'CLAIMS',
      details: { claimNumber, isInternal, organizationId },
    });

    return NextResponse.json({
      success: true,
      message: "Note added successfully",
    });
  } catch (error) {
    logApiAuditEvent({
      timestamp: new Date().toISOString(),
      userId,
      endpoint: `/api/claims/${params.id}/status`,
      method: 'POST',
      eventType: 'server_error',
      severity: 'high',
      dataType: 'CLAIMS',
      details: { error: error instanceof Error ? error.message : 'Unknown error', organizationId },
    });
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to add note',
      error
    );
  }
}, { params });
