import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { arrearsCases, members, duesTransactions } from '@/services/financial-service/src/db/schema';
import { eq, and } from 'drizzle-orm';
import { logApiAuditEvent } from '@/lib/middleware/request-validation';
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';
import { withRLSContext } from '@/lib/db/with-rls-context';

// Validation schema for POST body
const createPaymentPlanSchema = z.object({
  memberId: z.string().uuid('Invalid member ID format'),
  installmentAmount: z.number().positive('Installment amount must be positive'),
  frequency: z.enum(['weekly', 'biweekly', 'monthly'], {
    errorMap: () => ({ message: 'Frequency must be weekly, biweekly, or monthly' }),
  }),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format'),
});

// Create a payment plan for an arrears case
export const POST = withEnhancedRoleAuth(20, async (request, context) => {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
  }

  const parsed = createPaymentPlanSchema.safeParse(rawBody);
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
      // Get member to verify tenant
      const [currentMember] = await db
        .select()
        .from(members)
        .where(eq(members.userId, userId))
        .limit(1);

      if (!currentMember) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(), userId,
          endpoint: '/api/arrears/create-payment-plan',
          method: 'POST',
          eventType: 'auth_failed',
          severity: 'high',
          details: { reason: 'Member not found' },
        });
        return NextResponse.json({ error: 'Member not found' }, { status: 404 });
      }

      const { memberId, installmentAmount, frequency, startDate } = body;

      // Get arrears case
      const [arrearsCase] = await db
        .select()
        .from(arrearsCases)
        .where(
          and(
            eq(arrearsCases.memberId, memberId),
            eq(arrearsCases.tenantId, currentMember.tenantId)
          )
        )
        .limit(1);

      if (!arrearsCase) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(), userId,
          endpoint: '/api/arrears/create-payment-plan',
          method: 'POST',
          eventType: 'auth_failed',
          severity: 'high',
          details: { reason: 'Arrears case not found', memberId },
        });
        return NextResponse.json({ error: 'Arrears case not found' }, { status: 404 });
      }

      // Calculate number of installments (round up)
      const totalOwed = parseFloat(arrearsCase.remainingBalance || arrearsCase.totalOwed);
      const installmentAmountNum = parseFloat(installmentAmount.toString());
      const numberOfInstallments = Math.ceil(totalOwed / installmentAmountNum);

      // Generate payment schedule
      const paymentSchedule = [];
      let currentDueDate = new Date(startDate);

      for (let i = 0; i < numberOfInstallments; i++) {
        const isLastInstallment = i === numberOfInstallments - 1;
        const amount = isLastInstallment 
          ? (totalOwed - (installmentAmountNum * (numberOfInstallments - 1))).toFixed(2)
          : installmentAmountNum.toFixed(2);

        paymentSchedule.push({
          installmentNumber: i + 1,
          dueDate: currentDueDate.toISOString().split('T')[0],
          amount: parseFloat(amount),
          status: 'pending',
        });

        // Calculate next due date based on frequency
        currentDueDate = new Date(currentDueDate);
        if (frequency === 'weekly') {
          currentDueDate.setDate(currentDueDate.getDate() + 7);
        } else if (frequency === 'biweekly') {
          currentDueDate.setDate(currentDueDate.getDate() + 14);
        } else if (frequency === 'monthly') {
          currentDueDate.setMonth(currentDueDate.getMonth() + 1);
        }
      }

      // Update arrears case with payment plan
      const [updatedCase] = await db
        .update(arrearsCases)
        .set({
          paymentPlanActive: true,
          paymentPlanAmount: installmentAmount.toString(),
          paymentPlanFrequency: frequency,
          paymentPlanStartDate: new Date(startDate).toISOString().split('T')[0],
          numberOfInstallments: numberOfInstallments.toString(),
          paymentSchedule: JSON.stringify(paymentSchedule),
          status: 'payment_plan',
          updatedAt: new Date(),
        })
        .where(eq(arrearsCases.id, arrearsCase.id))
        .returning();

      // Create future dues transactions for each installment
      const installmentTransactions = paymentSchedule.map((installment) => ({
        tenantId: currentMember.tenantId,
        memberId,
        transactionType: 'payment_plan_installment',
        amount: installment.amount.toString(),
        duesAmount: installment.amount.toString(),
        totalAmount: installment.amount.toString(),
        dueDate: new Date(installment.dueDate).toISOString().split('T')[0],
        periodStart: new Date(installment.dueDate).toISOString().split('T')[0],
        periodEnd: new Date(installment.dueDate).toISOString().split('T')[0],
        status: 'pending',
        notes: `Payment plan installment ${installment.installmentNumber} of ${numberOfInstallments}`,
        metadata: JSON.stringify({
          arrearsId: arrearsCase.id,
          installmentNumber: installment.installmentNumber,
        }),
      }));

      await withRLSContext({ organizationId }, async (db) => {
        return await db.insert(duesTransactions).values(installmentTransactions);
      });

      logApiAuditEvent({
        timestamp: new Date().toISOString(), userId,
        endpoint: '/api/arrears/create-payment-plan',
        method: 'POST',
        eventType: 'success',
        severity: 'high',
        details: {
          dataType: 'FINANCIAL',
          memberId,
          totalOwed,
          numberOfInstallments,
          installmentAmount,
          frequency,
          startDate,
        },
      });

      return NextResponse.json({
        message: 'Payment plan created successfully',
        case: updatedCase,
        paymentSchedule,
        numberOfInstallments,
        totalOwed,
      });

    } catch (error) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(), userId,
        endpoint: '/api/arrears/create-payment-plan',
        method: 'POST',
        eventType: 'error',
        severity: 'high',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      });
      return NextResponse.json(
        { error: 'Failed to create payment plan' },
        { status: 500 }
      );
    }
});


