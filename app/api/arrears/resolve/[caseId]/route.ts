import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logApiAuditEvent } from '@/lib/middleware/api-security';
import { db } from '@/db';
import { arrearsCases, members, duesTransactions } from '@/services/financial-service/src/db/schema';
import { eq, and } from 'drizzle-orm';
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';

/**
 * Validation schema for resolving arrears case
 */
const resolveCaseSchema = z.object({
  resolutionType: z.enum(['paid_in_full', 'payment_plan_completed', 'written_off', 'disputed_resolved', 'other'], {
    errorMap: () => ({ message: 'Invalid resolution type' }),
  }),
  resolutionNotes: z.string().optional(),
});

// Resolve an arrears case
export const POST = async (
  req: NextRequest,
  { params }: { params: { caseId: string } }
) => {
  return withRoleAuth(20, async (request, context) => {
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    const parsed = resolveCaseSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const body = parsed.data;
    const { userId, organizationId } = context;

    const orgId = (body as Record<string, unknown>)["organizationId"] ?? (body as Record<string, unknown>)["orgId"] ?? (body as Record<string, unknown>)["organization_id"] ?? (body as Record<string, unknown>)["org_id"] ?? (body as Record<string, unknown>)["tenantId"] ?? (body as Record<string, unknown>)["tenant_id"] ?? (body as Record<string, unknown>)["unionId"] ?? (body as Record<string, unknown>)["union_id"] ?? (body as Record<string, unknown>)["localId"] ?? (body as Record<string, unknown>)["local_id"];
    if (typeof orgId === 'string' && orgId.length > 0 && orgId !== context.organizationId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

  // Get member to verify tenant
        const [currentMember] = await db
          .select()
          .from(members)
          .where(eq(members.userId, userId))
          .limit(1);

        if (!currentMember) {
          logApiAuditEvent({
            timestamp: new Date().toISOString(), userId,
            endpoint: '/api/arrears/resolve/[caseId]',
            method: 'POST',
            eventType: 'validation_failed',
            severity: 'medium',
            details: { reason: 'Member not found' },
          });
          return NextResponse.json({ error: 'Member not found' }, { status: 404 });
        }

        try {
          const { resolutionType, resolutionNotes } = body;

          const { resolutionType, resolutionNotes } = body;

          // Get arrears case
          const [arrearsCase] = await db
            .select()
            .from(arrearsCases)
            .where(
              and(
                eq(arrearsCases.id, params.caseId),
                eq(arrearsCases.tenantId, currentMember.tenantId)
              )
            )
            .limit(1);

          if (!arrearsCase) {
            logApiAuditEvent({
              timestamp: new Date().toISOString(), userId,
              endpoint: '/api/arrears/resolve/[caseId]',
              method: 'POST',
              eventType: 'validation_failed',
              severity: 'medium',
              details: { reason: 'Arrears case not found', caseId: params.caseId },
            });
            return NextResponse.json({ error: 'Arrears case not found' }, { status: 404 });
          }

          // If resolution is payment_plan_completed, verify all installments are paid
          if (resolutionType === 'payment_plan_completed') {
            const unpaidInstallments = await db
              .select()
              .from(duesTransactions)
              .where(
                and(
                  eq(duesTransactions.memberId, arrearsCase.memberId),
                  eq(duesTransactions.tenantId, currentMember.tenantId),
                  eq(duesTransactions.transactionType, 'payment_plan_installment'),
                  eq(duesTransactions.status, 'pending')
                )
              );

            if (unpaidInstallments.length > 0) {
              logApiAuditEvent({
                timestamp: new Date().toISOString(), userId,
                endpoint: '/api/arrears/resolve/[caseId]',
                method: 'POST',
                eventType: 'validation_failed',
                severity: 'medium',
                details: { reason: 'Unpaid installments exist', unpaidCount: unpaidInstallments.length, caseId: params.caseId },
              });
              return NextResponse.json(
                { error: `Cannot mark as completed: ${unpaidInstallments.length} installments still unpaid` },
                { status: 400 }
              );
            }
          }

          // Prepare update data
          const updateData: any = {
            status: 'resolved',
            resolutionDate: new Date(),
            resolutionType,
            resolutionNotes: resolutionNotes || '',
            updatedAt: new Date(),
          };

          // Set remaining balance to 0 if paid in full
          if (resolutionType === 'paid_in_full' || resolutionType === 'payment_plan_completed') {
            updateData.remainingBalance = '0.00';
          }

          // Update arrears case
          const [updatedCase] = await db
            .update(arrearsCases)
            .set(updateData)
            .where(eq(arrearsCases.id, arrearsCase.id))
            .returning();

          // If member was suspended, restore to active status
          const [caseMember] = await db
            .select()
            .from(members)
            .where(eq(members.id, arrearsCase.memberId))
            .limit(1);

          if (caseMember && caseMember.status === 'suspended') {
            // Parse existing metadata safely
            let existingMetadata: Record<string, unknown> = {};
            if (caseMember.metadata) {
              try {
                existingMetadata = typeof caseMember.metadata === 'string' 
                  ? JSON.parse(caseMember.metadata) 
                  : (caseMember.metadata as Record<string, unknown>);
              } catch {
                existingMetadata = {};
              }
            }
            
            await db
              .update(members)
              .set({
                status: 'active',
                metadata: JSON.stringify({
                  ...existingMetadata,
                  restoredFromSuspension: true,
                  restoredDate: new Date().toISOString(),
                  restoredReason: `Arrears case resolved: ${resolutionType}`,
                }),
              })
              .where(eq(members.id, arrearsCase.memberId));
          }

          logApiAuditEvent({
            timestamp: new Date().toISOString(), userId,
            endpoint: '/api/arrears/resolve/[caseId]',
            method: 'POST',
            eventType: 'success',
            severity: 'high',
            details: {
              dataType: 'FINANCIAL',
              caseId: params.caseId,
              resolutionType,
              memberId: arrearsCase.memberId,
              memberRestored: caseMember?.status === 'suspended',
            },
          });

          return NextResponse.json({
            message: 'Arrears case resolved successfully',
            case: updatedCase,
            memberRestored: caseMember?.status === 'suspended',
          });

        } catch (error) {
          logApiAuditEvent({
            timestamp: new Date().toISOString(), userId,
            endpoint: '/api/arrears/resolve/[caseId]',
            method: 'POST',
            eventType: 'server_error',
            severity: 'high',
            details: { error: error instanceof Error ? error.message : 'Unknown error', caseId: params.caseId },
          });
return NextResponse.json(
            { error: 'Failed to resolve case' },
            { status: 500 }
          );
        }
  })(req, { params });
};

