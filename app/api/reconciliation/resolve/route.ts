import { z } from 'zod';
import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { members, duesTransactions, employerRemittances } from '@/services/financial-service/src/db/schema';
import { eq, and } from 'drizzle-orm';
import { withApiAuth,withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { checkRateLimit, RATE_LIMITS, createRateLimitHeaders } from '@/lib/rate-limiter';
import { sendEmail } from '@/lib/email-service';

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';

const reconciliationResolveSchema = z.object({
  remittanceId: z.string().uuid('Invalid remittance ID'),
  rowIndex: z.number().int().min(0, 'Row index must be non-negative'),
  action: z.enum(['create_member', 'adjust_amount', 'mark_resolved', 'request_correction'], {
    errorMap: () => ({ message: 'Invalid action' })
  }),
  actionData: z.record(z.string(), z.unknown()).optional(),
});
// Resolve reconciliation discrepancies
export const POST = async (req: NextRequest) => {
  return withRoleAuth(90, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      // Rate limiting: 10 reconciliation operations per hour per user
      const rateLimitResult = await checkRateLimit(userId, RATE_LIMITS.RECONCILIATION);
      if (!rateLimitResult.allowed) {
        return NextResponse.json(
          { 
            error: 'Rate limit exceeded. Too many reconciliation requests.',
            resetIn: rateLimitResult.resetIn 
          },
          { 
            status: 429,
            headers: createRateLimitHeaders(rateLimitResult),
          }
        );
      }

      // Get member to verify tenant
      const [member] = await db
        .select()
        .from(members)
        .where(eq(members.userId, userId))
        .limit(1);

      if (!member) {
        return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Member not found'
    );
      }

      const body = await req.json();
      
      // Validate request body
      const validation = reconciliationResolveSchema.safeParse(body);
      if (!validation.success) {
        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          'Invalid reconciliation resolution request',
          validation.error.errors
        );
      }

      const { remittanceId, rowIndex, action, actionData } = validation.data;

      // Get remittance record
      const [remittance] = await db
        .select()
        .from(employerRemittances)
        .where(
          and(
            eq(employerRemittances.id, remittanceId),
            eq(employerRemittances.tenantId, member.tenantId)
          )
        )
        .limit(1);

      if (!remittance) {
        return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Remittance not found'
    );
      }

      // Parse metadata to get results
      let metadata: Record<string, unknown> = (remittance.metadata as Record<string, unknown>) || {};
      if (typeof metadata === 'string') {
        metadata = JSON.parse(metadata);
      }

      const results = metadata.results || [];
      if (!results[rowIndex]) {
        return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Row index not found'
    );
      }

      const row = results[rowIndex];
      let actionResult = null;

      // Execute action
      switch (action) {
        case 'create_member':
          // Create new member from row data
          if (!actionData?.name) {
            return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'name required for create_member action'
    );
          }

          const [newMember] = await db
            .insert(members)
            .values({
              tenantId: member.tenantId,
              organizationId: member.organizationId,
              userId: '', // Will be updated when user claims profile
              name: actionData.name,
              email: actionData.email || row.row.email || '',
              membershipNumber: row.row.memberNumber || null,
              status: 'active',
              unionJoinDate: new Date(),
              metadata: JSON.stringify({
                createdFrom: 'reconciliation',
                remittanceId,
                rowIndex,
                originalData: row.row,
              }),
            })
            .returning();

          actionResult = { action: 'create_member', member: newMember };
          row.matchStatus = 'manually_resolved';
          row.resolution = 'Member created';
          break;

        case 'adjust_amount':
          // Adjust transaction amount to match uploaded amount
          if (!row.transaction) {
            return NextResponse.json(
              { error: 'No transaction found to adjust' },
              { status: 400 }
            );
          }

          const newAmount = actionData?.newAmount || row.row.amount;
          const oldAmount = row.transaction.totalAmount;

          const [updatedTransaction] = await db
            .update(duesTransactions)
            .set({
              totalAmount: newAmount.toString(),
              metadata: JSON.stringify({
                ...((row.transaction.metadata as any) || {}),
                adjusted: true,
                adjustedFrom: oldAmount,
                adjustedTo: newAmount,
                adjustedBy: userId,
                adjustedAt: new Date().toISOString(),
                adjustmentReason: actionData?.reason || 'Reconciliation adjustment',
              }),
            })
            .where(eq(duesTransactions.id, row.transaction.id))
            .returning();

          actionResult = { action: 'adjust_amount', transaction: updatedTransaction, oldAmount, newAmount };
          row.matchStatus = 'manually_resolved';
          row.resolution = `Amount adjusted from ${oldAmount} to ${newAmount}`;
          break;

        case 'mark_resolved':
          // Mark row as manually resolved
          row.matchStatus = 'manually_resolved';
          row.resolution = actionData?.notes || 'Manually resolved';
          row.resolvedBy = userId;
          row.resolvedAt = new Date().toISOString();

          actionResult = { action: 'mark_resolved', notes: row.resolution };
          break;

        case 'request_correction':
          // Generate email to employer (placeholder - requires email service)
          row.matchStatus = 'correction_requested';
          row.correctionRequested = true;
          row.correctionRequestedAt = new Date().toISOString();
          row.correctionNotes = actionData?.notes || 'Correction requested from employer';

          const employerEmail = actionData?.employerEmail || row.row?.email;
          if (employerEmail) {
            await sendEmail({
              to: [{ email: employerEmail, name: remittance.employerName }],
              subject: `Correction requested for remittance ${remittanceId}`,
              html: `
                <p>A correction is requested for remittance <strong>${remittanceId}</strong>.</p>
                <p>Notes: ${row.correctionNotes}</p>
              `,
            });
          }

          actionResult = {
            action: 'request_correction',
            message: employerEmail ? 'Correction request sent to employer' : 'No employer email available',
            notes: row.correctionNotes,
          };
          break;
      }

      // Update remittance metadata with modified results
      results[rowIndex] = row;
      await db
        .update(employerRemittances)
        .set({
          metadata: { ...metadata, results },
          updatedAt: new Date(),
        })
        .where(eq(employerRemittances.id, remittanceId));

      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: '/api/reconciliation/resolve',
        method: 'POST',
        eventType: 'success',
        severity: 'high',
        details: {
          dataType: 'FINANCIAL',
          remittanceId,
          action,
          rowIndex,
        },
      });

      return NextResponse.json({
        message: 'Resolution action completed',
        action: actionResult,
        updatedRow: row,
      });

    } catch (error) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: '/api/reconciliation/resolve',
        method: 'POST',
        eventType: 'server_error',
        severity: 'high',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      });
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to resolve reconciliation',
      error
    );
    }
    })(request);
};

