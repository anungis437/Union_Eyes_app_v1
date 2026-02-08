/**
 * Claims Detail API Routes
 * 
 * MIGRATION STATUS: ✅ Migrated to use withRLSContext()
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
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";
import { withRLSContext } from '@/lib/db/with-rls-context';

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
  return withEnhancedRoleAuth(10, async (request, context) => {
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
            timestamp: new Date().toISOString(), userId,
            endpoint: `/api/claims/${claimNumber}`,
            method: 'GET',
            eventType: 'validation_failed',
            severity: 'low',
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
          timestamp: new Date().toISOString(), userId,
          endpoint: `/api/claims/${claimNumber}`,
          method: 'GET',
          eventType: 'success',
          severity: 'low',
          details: { claimNumber, organizationId, updatesCount: updates.length },
        });

        return NextResponse.json({
          claim,
          updates,
        });
      });
    } catch (error) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(), userId,
          endpoint: `/api/claims/${params.id}`,
          method: 'GET',
          eventType: 'server_error',
          severity: 'high',
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
        });
        console.error("Error fetching claim:", error);
        return NextResponse.json(
          { error: "Failed to fetch claim" },
          { status: 500 }
        );
      }
      })(request, { params });
};

/**
 * PATCH /api/claims/[id]
 * Update a claim
 */
export const PATCH = async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
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
    const { userId, organizationId } = context;

    const orgId = (body as Record<string, unknown>)["organizationId"] ?? (body as Record<string, unknown>)["orgId"] ?? (body as Record<string, unknown>)["organization_id"] ?? (body as Record<string, unknown>)["org_id"] ?? (body as Record<string, unknown>)["tenantId"] ?? (body as Record<string, unknown>)["tenant_id"] ?? (body as Record<string, unknown>)["unionId"] ?? (body as Record<string, unknown>)["union_id"] ?? (body as Record<string, unknown>)["localId"] ?? (body as Record<string, unknown>)["local_id"];
    if (typeof orgId === 'string' && orgId.length > 0 && orgId !== context.organizationId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

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
            timestamp: new Date().toISOString(), userId,
            endpoint: `/api/claims/${claimNumber}`,
            method: 'PATCH',
            eventType: 'validation_failed',
            severity: 'low',
            details: { reason: 'Claim not found', claimNumber },
          });
          return NextResponse.json({ error: "Claim not found" }, { status: 404 });
        }

        // Update claim - RLS policies enforce tenant isolation
        const [updatedClaim] = await tx
          .update(claims)
          .set({
            ...body,
            updatedAt: new Date(),
          })
          .where(eq(claims.claimId, existingClaim.claimId))
          .returning();

        logApiAuditEvent({
          timestamp: new Date().toISOString(), userId,
          endpoint: `/api/claims/${claimNumber}`,
          method: 'PATCH',
          eventType: 'success',
          severity: 'medium',
          details: { claimNumber, organizationId, updatedFields: Object.keys(body) },
        });

        return NextResponse.json({
          claim: updatedClaim,
          message: "Claim updated successfully",
        });
      });
    } catch (error) {
          logApiAuditEvent({
            timestamp: new Date().toISOString(), userId,
            endpoint: `/api/claims/${params.id}`,
            method: 'PATCH',
            eventType: 'server_error',
            severity: 'high',
            details: { error: error instanceof Error ? error.message : 'Unknown error' },
          });
          console.error("Error updating claim:", error);
          return NextResponse.json(
            { error: "Failed to update claim" },
            { status: 500 }
          );
        }
        })(request, { params });
};

/**
 * DELETE /api/claims/[id]
 * Delete a claim (soft delete)
 */
export const DELETE = async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
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
            timestamp: new Date().toISOString(), userId,
            endpoint: `/api/claims/${claimNumber}`,
            method: 'DELETE',
            eventType: 'validation_failed',
            severity: 'low',
            details: { reason: 'Claim not found', claimNumber },
          });
          return NextResponse.json({ error: "Claim not found" }, { status: 404 });
        }

        // Soft delete by setting closedAt - RLS policies enforce tenant isolation
        await tx
          .update(claims)
          .set({
            status: "closed",
            closedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(claims.claimId, existingClaim.claimId));

        logApiAuditEvent({
          timestamp: new Date().toISOString(), userId,
          endpoint: `/api/claims/${claimNumber}`,
          method: 'DELETE',
          eventType: 'success',
          severity: 'medium',
          details: { claimNumber, organizationId },
        });

        return NextResponse.json({
          message: "Claim deleted successfully",
        });
      });
    } catch (error) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(), userId,
          endpoint: `/api/claims/${params.id}`,
          method: 'DELETE',
          eventType: 'server_error',
          severity: 'high',
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
        });
        console.error("Error deleting claim:", error);
        return NextResponse.json(
          { error: "Failed to delete claim" },
          { status: 500 }
        );
      }
      })(request, { params });
};

