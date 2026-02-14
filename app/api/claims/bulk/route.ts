/**
 * Claims Bulk Operations API Route
 * POST /api/claims/bulk - Perform bulk operations on claims
 * 
 * Operations:
 * - assign: Bulk assign claims to stewards
 * - updateStatus: Bulk update claim status
 * - updatePriority: Bulk update priority
 * - close: Bulk close claims
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/db";
import { claims } from "@/db/schema/domains/claims";
import { eq, inArray, and } from "drizzle-orm";
import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limiter";
import { standardErrorResponse, standardSuccessResponse, ErrorCode } from '@/lib/api/standardized-responses';

/**
 * Validation schemas for bulk claim operations
 */
const bulkAssignSchema = z.object({
  operation: z.literal('assign'),
  claimIds: z.array(z.string().uuid('Invalid claim ID')).min(1, 'Must have at least one claim'),
  assignedTo: z.string().uuid('Invalid steward ID'),
});

const bulkUpdateStatusSchema = z.object({
  operation: z.literal('updateStatus'),
  claimIds: z.array(z.string().uuid('Invalid claim ID')).min(1, 'Must have at least one claim'),
  status: z.enum(['submitted', 'acknowledged', 'under_review', 'investigating', 'pending_response', 'negotiating', 'resolved', 'closed', 'withdrawn']),
});

const bulkUpdatePrioritySchema = z.object({
  operation: z.literal('updatePriority'),
  claimIds: z.array(z.string().uuid('Invalid claim ID')).min(1, 'Must have at least one claim'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
});

const bulkCloseSchema = z.object({
  operation: z.literal('close'),
  claimIds: z.array(z.string().uuid('Invalid claim ID')).min(1, 'Must have at least one claim'),
  resolutionOutcome: z.enum(['won', 'lost', 'settled', 'withdrawn', 'escalated']).optional(),
  closureNotes: z.string().optional(),
});

const bulkOperationSchema = z.discriminatedUnion('operation', [
  bulkAssignSchema,
  bulkUpdateStatusSchema,
  bulkUpdatePrioritySchema,
  bulkCloseSchema,
]);

/**
 * POST /api/claims/bulk
 * Perform bulk operations on claims
 */
export const POST = withEnhancedRoleAuth<any>(30, async (request: NextRequest, context): Promise<NextResponse<any>> => {
  const { userId, organizationId } = context;

  // Check rate limit
  const rateLimitResult = await checkRateLimit(
    `claims-bulk:${userId}`,
    { ...RATE_LIMITS.CLAIMS_OPERATIONS, identifier: 'claims-bulk' }
  );

  if (!rateLimitResult.allowed) {
    return standardErrorResponse(
      ErrorCode.RATE_LIMIT_EXCEEDED,
      'Rate limit exceeded. Please try again later.'
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid JSON in request body'
    );
  }

  const parsed = bulkOperationSchema.safeParse(rawBody);
  if (!parsed.success) {
    return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid request body',
      parsed.error
    );
  }

  const { operation, claimIds } = parsed.data;

  try {
    let result;

    switch (operation) {
      case 'assign':
        result = await handleBulkAssign(claimIds, parsed.data.assignedTo!, userId, organizationId);
        break;
      case 'updateStatus':
        result = await handleBulkStatusUpdate(claimIds, parsed.data.status!, userId, organizationId);
        break;
      case 'updatePriority':
        result = await handleBulkPriorityUpdate(claimIds, parsed.data.priority!, userId, organizationId);
        break;
      case 'close':
        result = await handleBulkClose(claimIds, parsed.data.resolutionOutcome, parsed.data.closureNotes, userId, organizationId);
        break;
      default:
        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          'Invalid operation type'
        );
    }

    logApiAuditEvent({
      timestamp: new Date().toISOString(),
      userId,
      endpoint: '/api/claims/bulk',
      method: 'POST',
      eventType: 'success',
      severity: 'medium',
      details: { operation, claimCount: claimIds.length, result: result.summary },
    });

    return standardSuccessResponse(result);
  } catch (error) {
    logApiAuditEvent({
      timestamp: new Date().toISOString(),
      userId,
      endpoint: '/api/claims/bulk',
      method: 'POST',
      eventType: 'auth_failed',
      severity: 'high',
      details: { operation, error: error instanceof Error ? error.message : 'Unknown error' },
    });

    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to perform bulk operation',
      error instanceof Error ? error : undefined
    );
  }
});

/**
 * Handle bulk assignment of claims to a steward
 */
async function handleBulkAssign(
  claimIds: string[],
  assignedTo: string,
  userId: string,
  organizationId: string
) {
  // Verify claims belong to organization and update
  const existingClaims = await db
    .select({ id: claims.claimId })
    .from(claims)
    .where(
      and(
        inArray(claims.claimId, claimIds),
        eq(claims.organizationId, organizationId)
      )
    );

  const existingIds = existingClaims.map(c => c.id);
  const notFoundIds = claimIds.filter(id => !existingIds.includes(id));

  if (existingIds.length > 0) {
    await db
      .update(claims)
      .set({
        assignedTo,
        updatedAt: new Date(),
      })
      .where(inArray(claims.claimId, existingIds));
  }

  return {
    summary: {
      total: claimIds.length,
      updated: existingIds.length,
      notFound: notFoundIds.length,
    },
    updatedClaimIds: existingIds,
    notFoundClaimIds: notFoundIds,
  };
}

/**
 * Handle bulk status update
 */
async function handleBulkStatusUpdate(
  claimIds: string[],
  status: string,
  userId: string,
  organizationId: string
) {
  // Verify claims belong to organization and update
  const existingClaims = await db
    .select({ id: claims.claimId })
    .from(claims)
    .where(
      and(
        inArray(claims.claimId, claimIds),
        eq(claims.organizationId, organizationId)
      )
    );

  const existingIds = existingClaims.map(c => c.id);
  const notFoundIds = claimIds.filter(id => !existingIds.includes(id));

  if (existingIds.length > 0) {
    const updateData: Record<string, unknown> = {
      status: status as any,
      updatedAt: new Date(),
    };

    // If resolving/closing, set resolvedAt
    if (status === 'resolved' || status === 'closed') {
      updateData.resolvedAt = new Date();
    }

    await db
      .update(claims)
      .set(updateData)
      .where(inArray(claims.claimId, existingIds));
  }

  return {
    summary: {
      total: claimIds.length,
      updated: existingIds.length,
      notFound: notFoundIds.length,
    },
    updatedClaimIds: existingIds,
    notFoundClaimIds: notFoundIds,
  };
}

/**
 * Handle bulk priority update
 */
async function handleBulkPriorityUpdate(
  claimIds: string[],
  priority: string,
  userId: string,
  organizationId: string
) {
  // Verify claims belong to organization and update
  const existingClaims = await db
    .select({ id: claims.claimId })
    .from(claims)
    .where(
      and(
        inArray(claims.claimId, claimIds),
        eq(claims.organizationId, organizationId)
      )
    );

  const existingIds = existingClaims.map(c => c.id);
  const notFoundIds = claimIds.filter(id => !existingIds.includes(id));

  if (existingIds.length > 0) {
    await db
      .update(claims)
      .set({
        priority: priority as any,
        updatedAt: new Date(),
      })
      .where(inArray(claims.claimId, existingIds));
  }

  return {
    summary: {
      total: claimIds.length,
      updated: existingIds.length,
      notFound: notFoundIds.length,
    },
    updatedClaimIds: existingIds,
    notFoundClaimIds: notFoundIds,
  };
}

/**
 * Handle bulk close
 */
async function handleBulkClose(
  claimIds: string[],
  resolutionOutcome?: string,
  closureNotes?: string,
  userId?: string,
  organizationId?: string
) {
  if (!organizationId) {
    throw new Error('Organization context required');
  }

  // Verify claims belong to organization and update
  const existingClaims = await db
    .select({ id: claims.claimId })
    .from(claims)
    .where(
      and(
        inArray(claims.claimId, claimIds),
        eq(claims.organizationId, organizationId)
      )
    );

  const existingIds = existingClaims.map(c => c.id);
  const notFoundIds = claimIds.filter(id => !existingIds.includes(id));

  if (existingIds.length > 0) {
    await db
      .update(claims)
      .set({
        status: 'closed',
        resolutionOutcome: resolutionOutcome as any,
        resolvedAt: new Date(),
        closedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(inArray(claims.claimId, existingIds));
  }

  return {
    summary: {
      total: claimIds.length,
      closed: existingIds.length,
      notFound: notFoundIds.length,
    },
    closedClaimIds: existingIds,
    notFoundClaimIds: notFoundIds,
  };
}
