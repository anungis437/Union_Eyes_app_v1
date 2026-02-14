import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { arrearsCases, members } from '@/services/financial-service/src/db/schema';
import { and } from 'drizzle-orm';
import { logApiAuditEvent } from '@/lib/middleware/request-validation';
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';

import { standardSuccessResponse } from '@/lib/api/standardized-responses';
// Validation schema for contact log
const logContactSchema = z.object({
  memberId: z.string().uuid('Invalid member ID format'),
  contactType: z.enum(['phone_call', 'email_sent', 'letter_sent', 'in_person', 'text_message'], {
    errorMap: () => ({ message: 'Invalid contact type' }),
  }),
  contactDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Contact date must be in YYYY-MM-DD format'),
  outcome: z.enum(['reached', 'voicemail', 'no_answer', 'payment_promised', 'refused', 'disputed', 'other'], {
    errorMap: () => ({ message: 'Invalid outcome' }),
  }),
  notes: z.string().optional(),
  attachmentUrl: z.string().url().optional().nullable(),
});

// Log contact attempt for an arrears case
export const POST = withEnhancedRoleAuth(20, async (request, context) => {
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

  const parsed = logContactSchema.safeParse(rawBody);
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
  if (typeof orgId === 'string' && orgId.length > 0 && orgId !== context.organizationId) {
    return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Forbidden',
      error
    );
  }

try {
      // Get member to verify organization
      const [currentMember] = await db
        .select()
        .from(members)
        .where(eq(members.userId, userId))
        .limit(1);

      if (!currentMember) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(), userId,
          endpoint: '/api/arrears/log-contact',
          method: 'POST',
          eventType: 'auth_failed',
          severity: 'medium',
          details: { reason: 'Member not found' },
        });
        return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Member not found'
    );
      }

      const { memberId, contactType, contactDate, outcome, notes, attachmentUrl } = body;

      // Get arrears case
      const [arrearsCase] = await db
        .select()
        .from(arrearsCases)
        .where(
          and(
            eq(arrearsCases.memberId, memberId),
            eq(arrearsCases.organizationId, currentMember.organizationId)
          )
        )
        .limit(1);

      if (!arrearsCase) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(), userId,
          endpoint: '/api/arrears/log-contact',
          method: 'POST',
          eventType: 'auth_failed',
          severity: 'medium',
          details: { reason: 'Arrears case not found', memberId },
        });
        return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Arrears case not found'
    );
      }

      // Parse existing contact history
      let contactHistory = [];
      try {
        if (arrearsCase.contactHistory) {
          contactHistory = typeof arrearsCase.contactHistory === 'string'
            ? JSON.parse(arrearsCase.contactHistory)
            : arrearsCase.contactHistory;
        }
      } catch (parseError) {
contactHistory = [];
      }

      // Create new contact entry
      const newContact = {
        id: crypto.randomUUID(),
        date: contactDate,
        type: contactType,
        outcome,
        notes: notes || '',
        attachmentUrl: attachmentUrl || null,
        recordedBy: userId,
        recordedByName: currentMember.name,
        recordedAt: new Date().toISOString(),
      };

      // Append to contact history
      contactHistory.push(newContact);

      // Update arrears case
      const [updatedCase] = await db
        .update(arrearsCases)
        .set({
          contactHistory: JSON.stringify(contactHistory),
          lastContactDate: new Date(contactDate),
          lastContactType: contactType,
          updatedAt: new Date(),
        })
        .where(eq(arrearsCases.id, arrearsCase.id))
        .returning();

      logApiAuditEvent({
        timestamp: new Date().toISOString(), userId,
        endpoint: '/api/arrears/log-contact',
        method: 'POST',
        eventType: 'success',
        severity: 'high',
        details: {
          dataType: 'FINANCIAL',
          memberId,
          contactType,
          outcome,
          caseId: arrearsCase.id,
        },
      });

      return NextResponse.json({
        message: 'Contact logged successfully',
        case: updatedCase,
        newContact,
      });

    } catch (error) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(), userId,
        endpoint: '/api/arrears/log-contact',
        method: 'POST',
        eventType: 'error',
        severity: 'high',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      });
      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to log contact',
      error
    );
    }
  });


