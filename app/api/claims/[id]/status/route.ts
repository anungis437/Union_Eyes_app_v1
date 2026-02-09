import { NextRequest, NextResponse } from "next/server";

import { updateClaimStatus, addClaimNote } from "@/lib/workflow-engine";
import { requireUser } from '@/lib/auth/unified-auth';
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { logApiAuditEvent } from '@/lib/middleware/api-security';
import { checkRateLimit, RATE_LIMITS, createRateLimitHeaders } from '@/lib/rate-limiter';

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
    const { status: newStatus, notes } = body;

    if (!newStatus) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: `/api/claims/${claimNumber}/status`,
        method: 'PATCH',
        eventType: 'validation_failed',
        severity: 'low',
        dataType: 'CLAIMS',
        details: { reason: 'Status is required', claimNumber },
      });
      return NextResponse.json(
        { error: "Status is required" },
        { status: 400 }
      );
    }

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
    console.error("Error updating claim status:", error);
    return NextResponse.json(
      { error: "Failed to update status" },
      { status: 500 }
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
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
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
    console.error("Error adding claim note:", error);
    return NextResponse.json(
      { error: "Failed to add note" },
      { status: 500 }
    );
  }
}, { params });
