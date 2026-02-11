/**
 * Claims Detail API Routes
 * 
 * MIGRATION STATUS: âœ… Migrated to use withRLSContext()
 * - All database operations wrapped in withRLSContext() for automatic context setting
 * - RLS policies enforce tenant isolation at database level
 * - Removed manual tenant lookup (getUserTenant) - RLS handles this
 * - Removed manual cross-tenant access checks - RLS enforces this
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { claims, claimUpdates } from "@/db/schema/claims-schema";
import { eq, desc, sql } from "drizzle-orm";
import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';
import { withRLSContext } from '@/lib/db/with-rls-context';
import { updateClaimStatus, type ClaimStatus } from '@/lib/workflow-engine';

/**
 * Validation schema for updating claims
 */
const updateClaimSchema = z.object({
  status: z.enum(['submitted', 'under_review', 'investigating', 'resolved', 'rejected', 'closed']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  description: z.string().optional(),
  desiredOutcome: z.string().optional(),
  witnessDetails: z.string().optional().nullable(),
  previousReportDetails: z.string().optional().nullable(),
  attachments: z.array(z.any()).optional(),
  voiceTranscriptions: z.array(z.any()).optional(),
  metadata: z.record(z.any()).optional(),
});

/**
 * GET /api/claims/[id]
 * Fetch a single claim by ID with updates
 */
export const GET = async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  return withEnhancedRoleAuth(30, async (request, context) => {
    const { userId, organizationId } = context;

    try {
      const claimNumber = params.id;

      // All database operations wrapped in withRLSContext - RLS policies handle tenant isolation
      return withRLSContext(async (tx) => {
        // Fetch claim by claim number - RLS policies automatically enforce tenant filtering
        const [claim] = await tx
          .select()
          .from(claims)
          .where(eq(claims.claimNumber, claimNumber));

        if (!claim) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(), 
          userId,
          endpoint: `/api/claims/${claimNumber}`,
          method: 'GET',
          eventType: 'validation_failed',
          severity: 'low',
          dataType: 'CLAIMS',
          details: { reason: 'Claim not found', claimNumber },
        });
          return NextResponse.json({ error: "Claim not found" }, { status: 404 });
        }

        // Fetch claim updates using the claim's UUID - RLS policies enforce access
        const updates = await tx
          .select()
          .from(claimUpdates)
          .where(eq(claimUpdates.claimId, claim.claimId))
          .orderBy(desc(claimUpdates.createdAt));

        logApiAuditEvent({
          timestamp: new Date().toISOString(), 
          userId,
          endpoint: `/api/claims/${claimNumber}`,
          method: 'GET',
          eventType: 'success',
          severity: 'low',
          dataType: 'CLAIMS',
          details: { claimNumber, organizationId, updatesCount: updates.length },
        });

        return NextResponse.json({
          claim,
          updates,
        });
      });
    } catch (error) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(), 
          userId,
          endpoint: `/api/claims/${params.id}`,
          method: 'GET',
          eventType: 'server_error',
          severity: 'high',
          dataType: 'CLAIMS',
          details: { error: error instanceof Error ? error.message : 'Unknown error', organizationId },
        });
return NextResponse.json(
          { error: "Failed to fetch claim" },
          { status: 500 }
        );
      }
  })(request);
};

/**
 * PATCH /api/claims/[id]
 * Update a claim
 */
export const PATCH = async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  return withEnhancedRoleAuth(60, async (request, context) => {
    const { userId, organizationId } = context;
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    const parsed = updateClaimSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const body = parsed.data;

  try {
      const claimNumber = params.id;

      // All database operations wrapped in withRLSContext - RLS policies handle tenant isolation
      return withRLSContext(async (tx) => {
        // Check if claim exists - RLS policies automatically enforce tenant filtering
        const [existingClaim] = await tx
          .select()
          .from(claims)
          .where(eq(claims.claimNumber, claimNumber));

        if (!existingClaim) {
          logApiAuditEvent({
            timestamp: new Date().toISOString(), 
            userId,
            endpoint: `/api/claims/${claimNumber}`,
            method: 'PATCH',
            eventType: 'validation_failed',
            severity: 'low',
            dataType: 'CLAIMS',
            details: { reason: 'Claim not found', claimNumber },
          });
          return NextResponse.json({ error: "Claim not found" }, { status: 404 });
        }

        // SECURITY FIX (PR #7): Extract status from body to enforce FSM validation
        const { status, ...safeUpdates } = body;

        // If status change requested, enforce FSM validation via workflow engine
        if (status && status !== existingClaim.status) {
          const result = await updateClaimStatus(
            claimNumber,
            status as ClaimStatus,
            userId,
            'Status update via API',
            tx
          );

          if (!result.success) {
            logApiAuditEvent({
              timestamp: new Date().toISOString(),
              userId,
              endpoint: `/api/claims/${claimNumber}`,
              method: 'PATCH',
              eventType: 'validation_failed',
              severity: 'medium',
              dataType: 'CLAIMS',
              details: {
                reason: 'FSM validation failed',
                currentStatus: existingClaim.status,
                requestedStatus: status,
                error: result.error,
              },
            });
            return NextResponse.json(
              { error: result.error || 'Invalid status transition' },
              { status: 400 }
            );
          }
        }

        // Update other fields safely (status excluded from spread)
        const [updatedClaim] = await tx
          .update(claims)
          .set({
            ...safeUpdates,
            updatedAt: new Date(),
          })
          .where(eq(claims.claimId, existingClaim.claimId))
          .returning();

        logApiAuditEvent({
          timestamp: new Date().toISOString(), 
          userId,
          endpoint: `/api/claims/${claimNumber}`,
          method: 'PATCH',
          eventType: 'success',
          severity: 'medium',
          dataType: 'CLAIMS',
          details: { claimNumber, organizationId, updatedFields: Object.keys(body) },
        });

        return NextResponse.json({
          claim: updatedClaim,
          message: "Claim updated successfully",
        });
      });
    } catch (error) {
          logApiAuditEvent({
            timestamp: new Date().toISOString(), 
            userId,
            endpoint: `/api/claims/${params.id}`,
            method: 'PATCH',
            eventType: 'server_error',
            severity: 'high',
            dataType: 'CLAIMS',
            details: { error: error instanceof Error ? error.message : 'Unknown error', organizationId },
          });
return NextResponse.json(
            { error: "Failed to update claim" },
            { status: 500 }
          );
        }
  })(request);
};

/**
 * DELETE /api/claims/[id]
 * Delete a claim (soft delete)
 */
export const DELETE = async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  return withEnhancedRoleAuth(60, async (request, context) => {
    const { userId, organizationId } = context;

    try {
      const claimNumber = params.id;

      // All database operations wrapped in withRLSContext - RLS policies handle tenant isolation
      return withRLSContext(async (tx) => {
        // Check if claim exists - RLS policies automatically enforce tenant filtering
        const [existingClaim] = await tx
          .select()
          .from(claims)
          .where(eq(claims.claimNumber, claimNumber));

        if (!existingClaim) {
          logApiAuditEvent({
            timestamp: new Date().toISOString(), 
            userId,
            endpoint: `/api/claims/${claimNumber}`,
            method: 'DELETE',
            eventType: 'validation_failed',
            severity: 'low',
            dataType: 'CLAIMS',
            details: { reason: 'Claim not found', claimNumber },
          });
          return NextResponse.json({ error: "Claim not found" }, { status: 404 });
        }

        // SECURITY FIX (PR #7): Enforce FSM validation via workflow engine
        // This ensures cooling-off periods, role checks, and signal checks are enforced
        const result = await updateClaimStatus(
          claimNumber,
          'closed',
          userId,
          'Claim closed via DELETE endpoint',
          tx
        );

        if (!result.success) {
          logApiAuditEvent({
            timestamp: new Date().toISOString(),
            userId,
            endpoint: `/api/claims/${claimNumber}`,
            method: 'DELETE',
            eventType: 'validation_failed',
            severity: 'medium',
            dataType: 'CLAIMS',
            details: {
              reason: 'FSM validation failed',
              currentStatus: existingClaim.status,
              error: result.error,
            },
          });
          return NextResponse.json(
            { error: result.error || 'Cannot close claim at this time' },
            { status: 400 }
          );
        }

        // Update closedAt timestamp after successful FSM transition
        await tx
          .update(claims)
          .set({
            closedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(claims.claimId, existingClaim.claimId));

        logApiAuditEvent({
          timestamp: new Date().toISOString(), 
          userId,
          endpoint: `/api/claims/${claimNumber}`,
          method: 'DELETE',
          eventType: 'success',
          severity: 'medium',
          dataType: 'CLAIMS',
          details: { claimNumber, organizationId },
        });

        return NextResponse.json({
          message: "Claim deleted successfully",
        });
      });
    } catch (error) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(), 
          userId,
          endpoint: `/api/claims/${params.id}`,
          method: 'DELETE',
          eventType: 'server_error',
          severity: 'high',
          dataType: 'CLAIMS',
          details: { error: error instanceof Error ? error.message : 'Unknown error', organizationId },
        });
return NextResponse.json(
          { error: "Failed to delete claim" },
          { status: 500 }
        );
      }
  })(request);
};

