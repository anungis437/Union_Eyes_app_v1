/**
 * Claims Workflow API
 * 
 * MIGRATION STATUS: âœ… Migrated to use withRLSContext()
 * - All database operations wrapped in withRLSContext() for automatic context setting
 * - RLS policies enforce organization isolation at database level
 */

import { NextRequest, NextResponse } from "next/server";
import { claims } from "@/db/schema/domains/claims";
import { eq } from "drizzle-orm";
import { getClaimWorkflowStatus } from "@/lib/workflow-engine";
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';
import { withRLSContext } from '@/lib/db/with-rls-context';
import { logApiAuditEvent } from '@/lib/middleware/api-security';

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
/**
 * GET /api/claims/[id]/workflow
 * Get workflow status and allowed transitions for a claim
 */
export const GET = withEnhancedRoleAuth(30, async (request, context) => {
  const { userId, organizationId } = context;

  try {
    const claimNumber = params.id;

    // All database operations wrapped in withRLSContext - RLS policies handle organization isolation
    return withRLSContext(async (tx) => {
      // Get claim - RLS policies automatically enforce organization filtering
      const [claim] = await tx
        .select()
        .from(claims)
        .where(eq(claims.claimNumber, claimNumber))
        .limit(1);

      if (!claim) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: `/api/claims/${claimNumber}/workflow`,
          method: 'GET',
          eventType: 'validation_failed',
          severity: 'low',
          dataType: 'CLAIMS',
          details: { reason: 'Claim not found', claimNumber },
        });
        return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Claim not found'
    );
      }

      // Check if user has access (claim owner or assigned steward)
      if (claim.memberId !== userId && claim.assignedTo !== userId) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: `/api/claims/${claimNumber}/workflow`,
          method: 'GET',
          eventType: 'auth_failed',
          severity: 'medium',
          dataType: 'CLAIMS',
          details: { reason: 'Unauthorized access attempt', claimNumber, organizationId },
        });
        return NextResponse.json(
          { error: "Unauthorized to view this claim" },
          { status: 403 }
        );
      }

      // Get workflow status
      const workflowStatus = getClaimWorkflowStatus(claim);

      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: `/api/claims/${claimNumber}/workflow`,
        method: 'GET',
        eventType: 'success',
        severity: 'low',
        dataType: 'CLAIMS',
        details: { claimNumber, organizationId },
      });

      return NextResponse.json({
        success: true,
        workflow: workflowStatus,
      });
    });
  } catch (error) {
    logApiAuditEvent({
      timestamp: new Date().toISOString(),
      userId,
      endpoint: `/api/claims/${params.id}/workflow`,
      method: 'GET',
      eventType: 'server_error',
      severity: 'high',
      dataType: 'CLAIMS',
      details: { error: error instanceof Error ? error.message : 'Unknown error', organizationId },
    });
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to get workflow status',
      error
    );
  }
}, { params });
