/**
 * CLC Per-Capita Remittance Submission API
 * Purpose: Mark remittance as submitted with file upload/reference
 * 
 * Endpoint:
 * - POST /api/admin/clc/remittances/[id]/submit - Submit remittance
 * 
 * MIGRATION STATUS: âœ… Migrated to use withRLSContext()
 * - Removed manual SET app.current_user_id command
 * - All database operations wrapped in withRLSContext() for automatic context setting
 * - Transaction ensures atomic status update
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logApiAuditEvent } from '@/lib/middleware/api-security';
import { perCapitaRemittances } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { withRLSContext } from '@/lib/db/with-rls-context';

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
const submitRemittanceSchema = z.object({
  notes: z.string().optional(),
});

// =====================================================================================
// POST - Submit remittance
// =====================================================================================

export const POST = async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  return withRoleAuth(90, async (request, context) => {
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid JSON in request body',
      error
    );
    }

    const parsed = submitRemittanceSchema.safeParse(rawBody);
    if (!parsed.success) {
      return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid request body',
      error
    );
    }

    const body = parsed.data;
    const { userId, organizationId } = context;

    const orgId = (body as Record<string, unknown>)["organizationId"] ?? (body as Record<string, unknown>)["orgId"] ?? (body as Record<string, unknown>)["organization_id"] ?? (body as Record<string, unknown>)["org_id"] ?? (body as Record<string, unknown>)["unionId"] ?? (body as Record<string, unknown>)["union_id"] ?? (body as Record<string, unknown>)["localId"] ?? (body as Record<string, unknown>)["local_id"];
    if (typeof orgId === 'string' && orgId.length > 0 && orgId !== organizationId) {
      return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Forbidden',
      error
    );
    }

  try {
      const remittanceId = params.id;

      // All database operations wrapped in withRLSContext for automatic context setting
      return withRLSContext(async (tx) => {
        // Validate remittance exists
        const [existing] = await tx
          .select()
          .from(perCapitaRemittances)
          .where(eq(perCapitaRemittances.id, remittanceId))
          .limit(1);

          if (!existing) {
            logApiAuditEvent({
              timestamp: new Date().toISOString(), userId,
              endpoint: '/api/admin/clc/remittances/[id]/submit',
              method: 'POST',
              eventType: 'validation_failed',
              severity: 'medium',
              details: { reason: 'Remittance not found', remittanceId },
            });
            return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Remittance not found'
    );
          }

          // Validate current status
          if (existing.status === 'paid') {
            logApiAuditEvent({
              timestamp: new Date().toISOString(), userId,
              endpoint: '/api/admin/clc/remittances/[id]/submit',
              method: 'POST',
              eventType: 'validation_failed',
              severity: 'medium',
              details: { reason: 'Already paid', remittanceId, status: existing.status },
            });
            return NextResponse.json(
              { error: 'Remittance already paid' },
              { status: 400 }
            );
          }

          if (existing.status === 'submitted') {
            logApiAuditEvent({
              timestamp: new Date().toISOString(), userId,
              endpoint: '/api/admin/clc/remittances/[id]/submit',
              method: 'POST',
              eventType: 'validation_failed',
              severity: 'medium',
              details: { reason: 'Already submitted', remittanceId, status: existing.status },
            });
            return NextResponse.json(
              { error: 'Remittance already submitted' },
              { status: 400 }
            );
          }

        // Update remittance status to submitted
        const [updated] = await tx
          .update(perCapitaRemittances)
          .set({
            status: 'submitted',
            submittedDate: new Date().toISOString(),
            notes: body.notes || existing.notes,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(perCapitaRemittances.id, remittanceId))
          .returning();

          logApiAuditEvent({
            timestamp: new Date().toISOString(), userId,
            endpoint: '/api/admin/clc/remittances/[id]/submit',
            method: 'POST',
            eventType: 'success',
            severity: 'high',
            details: {
              dataType: 'FINANCIAL',
              remittanceId,
              amount: existing.totalAmount,
              fromStatus: existing.status,
              toStatus: 'submitted',
            },
          });

        return NextResponse.json({
          ...updated,
          message: 'Remittance submitted successfully',
        });
      });
    } catch (error) {
          logApiAuditEvent({
            timestamp: new Date().toISOString(), userId,
            endpoint: '/api/admin/clc/remittances/[id]/submit',
            method: 'POST',
            eventType: 'server_error',
            severity: 'high',
            details: { error: error instanceof Error ? error.message : 'Unknown error', remittanceId: params.id },
          });
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to submit remittance',
      error
    );
        }
  })(request, { params });
};
