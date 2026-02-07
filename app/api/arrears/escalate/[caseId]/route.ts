import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logApiAuditEvent } from '@/lib/middleware/api-security';
import { db } from '@/db';
import { arrearsCases, members } from '@/services/financial-service/src/db/schema';
import { eq, and } from 'drizzle-orm';
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";

/**
 * Validation schema for escalating arrears case
 */
const escalateCaseSchema = z.object({
  reason: z.string().optional(),
});

// Escalate an arrears case to the next level
export const POST = async (
  req: NextRequest,
  { params }: { params: { caseId: string } }
) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    const parsed = escalateCaseSchema.safeParse(rawBody);
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
            endpoint: '/api/arrears/escalate/[caseId]',
            method: 'POST',
            eventType: 'validation_failed',
            severity: 'medium',
            details: { reason: 'Member not found' },
          });
          return NextResponse.json({ error: 'Member not found' }, { status: 404 });
        }

        try {
          const { reason } = body;

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
              endpoint: '/api/arrears/escalate/[caseId]',
              method: 'POST',
              eventType: 'validation_failed',
              severity: 'medium',
              details: { reason: 'Arrears case not found', caseId: params.caseId },
            });
            return NextResponse.json({ error: 'Arrears case not found' }, { status: 404 });
          }

          // Define escalation stages
          const escalationStages = [
            { level: 0, name: 'No action', description: 'Initial state' },
            { level: 1, name: 'Reminder', description: 'Friendly reminder sent (7 days overdue)' },
            { level: 2, name: 'Warning', description: 'Formal warning sent (14 days overdue)' },
            { level: 3, name: 'Suspension', description: 'Member benefits suspended (30 days overdue)' },
            { level: 4, name: 'Legal', description: 'Legal action or collections (60+ days overdue)' },
          ];

          const currentLevel = parseInt(String(arrearsCase.escalationLevel || '0'), 10);
          const newLevel = Math.min(currentLevel + 1, 4);

          if (newLevel === currentLevel) {
            logApiAuditEvent({
              timestamp: new Date().toISOString(), userId,
              endpoint: '/api/arrears/escalate/[caseId]',
              method: 'POST',
              eventType: 'validation_failed',
              severity: 'medium',
              details: { reason: 'Already at maximum escalation level', caseId: params.caseId },
            });
            return NextResponse.json(
              { error: 'Case is already at maximum escalation level' },
              { status: 400 }
            );
          }

          // Parse existing escalation history
          let escalationHistory = [];
          try {
            if (arrearsCase.escalationHistory) {
              escalationHistory = typeof arrearsCase.escalationHistory === 'string'
                ? JSON.parse(arrearsCase.escalationHistory)
                : arrearsCase.escalationHistory;
            }
          } catch (parseError) {
            console.error('Error parsing escalation history:', parseError);
            escalationHistory = [];
          }

          // Create escalation record
          const escalationRecord = {
            id: crypto.randomUUID(),
            fromLevel: currentLevel,
            fromStage: escalationStages[currentLevel].name,
            toLevel: newLevel,
            toStage: escalationStages[newLevel].name,
            reason: reason || `Escalated to ${escalationStages[newLevel].name}`,
            escalatedAt: new Date().toISOString(),
            escalatedBy: userId,
            escalatedByName: currentMember.name,
          };

          escalationHistory.push(escalationRecord);

          // Prepare update data
          const updateData: any = {
            escalationLevel: newLevel,
            escalationHistory: JSON.stringify(escalationHistory),
            lastEscalationDate: new Date(),
            updatedAt: new Date(),
          };

          // Handle special actions at certain levels
          if (newLevel === 3) {
            // Suspension level - update member status
            await db
              .update(members)
              .set({
                status: 'suspended',
                metadata: JSON.stringify({
                  ...(arrearsCase.metadata || {}),
                  suspensionReason: 'Arrears escalation - benefits suspended',
                  suspensionDate: new Date().toISOString(),
                }),
              })
              .where(eq(members.id, arrearsCase.memberId));
            
            updateData.notes = `Member suspended due to escalation. ${updateData.notes || ''}`;
          }

          if (newLevel === 4) {
            // Legal action level
            updateData.status = 'legal';
            updateData.notes = `Case escalated to legal action/collections. ${updateData.notes || ''}`;
          }

          // Update arrears case
          const [updatedCase] = await db
            .update(arrearsCases)
            .set(updateData)
            .where(eq(arrearsCases.id, arrearsCase.id))
            .returning();

          logApiAuditEvent({
            timestamp: new Date().toISOString(), userId,
            endpoint: '/api/arrears/escalate/[caseId]',
            method: 'POST',
            eventType: 'success',
            severity: 'high',
            details: {
              dataType: 'FINANCIAL',
              caseId: params.caseId,
              fromLevel: currentLevel,
              toLevel: newLevel,
              stage: escalationStages[newLevel].name,
              memberId: arrearsCase.memberId,
            },
          });

          return NextResponse.json({
            message: `Case escalated to level ${newLevel}: ${escalationStages[newLevel].name}`,
            case: updatedCase,
            escalation: escalationRecord,
            stage: escalationStages[newLevel],
          });

        } catch (error) {
          logApiAuditEvent({
            timestamp: new Date().toISOString(), userId,
            endpoint: '/api/arrears/escalate/[caseId]',
            method: 'POST',
            eventType: 'server_error',
            severity: 'high',
            details: { error: error instanceof Error ? error.message : 'Unknown error', caseId: params.caseId },
          });
          console.error('Escalate case error:', error);
          return NextResponse.json(
            { error: 'Failed to escalate case' },
            { status: 500 }
          );
        }
  })(req, { params });
};
