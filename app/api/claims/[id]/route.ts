import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/db";
import { claims, claimUpdates } from "@/db/schema/claims-schema";
import { eq, desc, sql } from "drizzle-orm";
import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";

/**
 * Helper function to get user's tenant context
 */
async function getUserTenant(userId: string): Promise<string | null> {
  try {
    const result = await db.execute(
      sql`SELECT organization_id FROM tenant_users WHERE user_id = ${userId} LIMIT 1`
    );
    if (result.length > 0) {
      return result[0].organization_id as string;
    }
    return null;
  } catch (_error) {
    return null;
  }
}

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

        // Get user's tenant
        const tenantId = await getUserTenant(userId);
        if (!tenantId) {
          logApiAuditEvent({
            timestamp: new Date().toISOString(), userId,
            endpoint: `/api/claims/${claimNumber}`,
            method: 'GET',
            eventType: 'auth_failed',
            severity: 'medium',
            details: { reason: 'User tenant not found' },
          });
          return NextResponse.json({ error: 'User tenant not found' }, { status: 403 });
        }

        // Fetch claim by claim number
        const [claim] = await db
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

        // Verify tenant isolation
        if (claim.organizationId !== tenantId) {
          logApiAuditEvent({
            timestamp: new Date().toISOString(), userId,
            endpoint: `/api/claims/${claimNumber}`,
            method: 'GET',
            eventType: 'auth_failed',
            severity: 'high',
            details: { reason: 'Cross-tenant access attempt', claimNumber },
          });
          return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        // Fetch claim updates using the claim's UUID
        const updates = await db
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
          details: { claimNumber, tenantId, updatesCount: updates.length },
        });

        return NextResponse.json({
          claim,
          updates,
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

          // Get user's tenant
          const tenantId = await getUserTenant(userId);
          if (!tenantId) {
            logApiAuditEvent({
              timestamp: new Date().toISOString(), userId,
              endpoint: `/api/claims/${claimNumber}`,
              method: 'PATCH',
              eventType: 'auth_failed',
              severity: 'medium',
              details: { reason: 'User tenant not found' },
            });
            return NextResponse.json({ error: 'User tenant not found' }, { status: 403 });
          }

          // Check if claim exists
          const [existingClaim] = await db
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

          // Verify tenant isolation
          if (existingClaim.organizationId !== tenantId) {
            logApiAuditEvent({
              timestamp: new Date().toISOString(), userId,
              endpoint: `/api/claims/${claimNumber}`,
              method: 'PATCH',
              eventType: 'auth_failed',
              severity: 'high',
              details: { reason: 'Cross-tenant access attempt', claimNumber },
            });
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
          }

          // Update claim
          const [updatedClaim] = await db
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
            details: { claimNumber, tenantId, updatedFields: Object.keys(body) },
          });

          return NextResponse.json({
            claim: updatedClaim,
            message: "Claim updated successfully",
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

        // Get user's tenant
        const tenantId = await getUserTenant(userId);
        if (!tenantId) {
          logApiAuditEvent({
            timestamp: new Date().toISOString(), userId,
            endpoint: `/api/claims/${claimNumber}`,
            method: 'DELETE',
            eventType: 'auth_failed',
            severity: 'medium',
            details: { reason: 'User tenant not found' },
          });
          return NextResponse.json({ error: 'User tenant not found' }, { status: 403 });
        }

        // Check if claim exists
        const [existingClaim] = await db
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

        // Verify tenant isolation
        if (existingClaim.organizationId !== tenantId) {
          logApiAuditEvent({
            timestamp: new Date().toISOString(), userId,
            endpoint: `/api/claims/${claimNumber}`,
            method: 'DELETE',
            eventType: 'auth_failed',
            severity: 'high',
            details: { reason: 'Cross-tenant access attempt', claimNumber },
          });
          return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        // Soft delete by setting closedAt
        await db
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
          details: { claimNumber, tenantId },
        });

        return NextResponse.json({
          message: "Claim deleted successfully",
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

