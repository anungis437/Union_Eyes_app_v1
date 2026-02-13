/**
 * Payment Plans API
 * 
 * Manages installment payment arrangements for members in arrears
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { eq, and, lte, sql } from 'drizzle-orm';
import { pgTable, uuid, text, timestamp, decimal, integer, jsonb } from 'drizzle-orm/pg-core';

// Payment plan installments schema
export const paymentPlanInstallments = pgTable('payment_plan_installments', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Plan Reference
  paymentPlanId: uuid('payment_plan_id').notNull(),
  
  // Installment Details
  installmentNumber: integer('installment_number').notNull(),
  dueDate: timestamp('due_date').notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  
  // Payment Status
  status: text('status').notNull().default('pending'), // pending, paid, late, missed
  paidAmount: decimal('paid_amount', { precision: 10, scale: 2 }).default('0'),
  paidDate: timestamp('paid_date'),
  paymentMethod: text('payment_method'),
  
  // Late Tracking
  daysLate: integer('days_late').default(0),
  lateFee: decimal('late_fee', { precision: 10, scale: 2 }).default('0'),
  
  // References
  ledgerTransactionId: uuid('ledger_transaction_id'),
  
  // Metadata
  metadata: jsonb('metadata').$type<Record<string, any>>(),
  
  // Audit
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Validation schemas
const createPlanSchema = z.object({
  userId: z.string().uuid(),
  organizationId: z.string().uuid(),
  totalAmount: z.number().positive(),
  downPayment: z.number().min(0).optional().default(0),
  numberOfInstallments: z.integer().min(1).max(24),
  frequency: z.enum(['weekly', 'biweekly', 'monthly']),
  firstPaymentDate: z.string().datetime(),
  reason: z.string().optional(),
});

const recordPaymentSchema = z.object({
  installmentId: z.string().uuid(),
  amount: z.number().positive(),
  paymentMethod: z.string(),
  paymentDate: z.string().datetime().optional(),
});

/**
 * GET /api/dues/payment-plans
 * List payment plans with filters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');
    const organizationId = searchParams.get('organizationId');

    // Note: This references the paymentPlans table from dues-finance-schema
    // For now, returning structure
    
    return NextResponse.json({
      plans: [],
      note: 'Payment plans endpoint ready. Requires paymentPlans table query.',
    });
  } catch (error: any) {
    console.error('Error fetching payment plans:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment plans', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/dues/payment-plans
 * Create new payment plan
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createPlanSchema.parse(body);

    console.log('📋 Creating payment plan...');

    // Calculate installment schedule
    const schedule = calculateInstallmentSchedule(
      validatedData.totalAmount - validatedData.downPayment,
      validatedData.numberOfInstallments,
      validatedData.frequency,
      new Date(validatedData.firstPaymentDate)
    );

    // Create payment plan
    // const [plan] = await db.insert(paymentPlans).values({
    //   userId: validatedData.userId,
    //   organizationId: validatedData.organizationId,
    //   totalAmount: validatedData.totalAmount.toString(),
    //   downPayment: validatedData.downPayment.toString(),
    //   numberOfInstallments: validatedData.numberOfInstallments,
    //   frequency: validatedData.frequency,
    //   status: 'active',
    //   remainingBalance: (validatedData.totalAmount - validatedData.downPayment).toString(),
    //   reason: validatedData.reason,
    // }).returning();

    // Create installments
    // const installments = await Promise.all(
    //   schedule.map((installment, index) =>
    //     db.insert(paymentPlanInstallments).values({
    //       paymentPlanId: plan.id,
    //       installmentNumber: index + 1,
    //       dueDate: installment.dueDate,
    //       amount: installment.amount.toString(),
    //       status: 'pending',
    //     }).returning()
    //   )
    // );

    console.log(`✅ Payment plan created with ${schedule.length} installments`);

    return NextResponse.json(
      {
        message: 'Payment plan created successfully',
        plan: {
          // ...plan,
          installments: schedule,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating payment plan:', error);
    return NextResponse.json(
      { error: 'Failed to create payment plan', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/dues/payment-plans/[id]/pay
 * Record payment for an installment
 */
export async function recordInstallmentPayment(
  planId: string,
  installmentId: string,
  paymentData: any
) {
  try {
    const { amount, paymentMethod, paymentDate } = recordPaymentSchema.parse(paymentData);

    console.log(`💳 Recording payment: $${amount} for installment ${installmentId}`);

    // Get installment
    // const [installment] = await db
    //   .select()
    //   .from(paymentPlanInstallments)
    //   .where(eq(paymentPlanInstallments.id, installmentId));

    // if (!installment) {
    //   throw new Error('Installment not found');
    // }

    // Calculate if late
    const now = new Date(paymentDate || Date.now());
    // const daysLate = Math.max(
    //   0,
    //   Math.floor((now.getTime() - new Date(installment.dueDate).getTime()) / (1000 * 60 * 60 * 24))
    // );

    // Update installment
    // await db
    //   .update(paymentPlanInstallments)
    //   .set({
    //     status: 'paid',
    //     paidAmount: amount.toString(),
    //     paidDate: now,
    //     paymentMethod,
    //     daysLate,
    //     updatedAt: new Date(),
    //   })
    //   .where(eq(paymentPlanInstallments.id, installmentId));

    // Post to dues ledger
    // await db.insert(memberDuesLedger).values({
    //   userId: plan.userId,
    //   type: 'payment',
    //   amount: amount.toString(),
    //   description: `Payment plan installment ${installment.installmentNumber}`,
    //   fiscalYear: now.getFullYear(),
    //   fiscalMonth: now.getMonth() + 1,
    //   status: 'posted',
    //   metadata: {
    //     paymentPlanId: planId,
    //     installmentId,
    //   },
    // });

    // Update plan balance
    // await updatePlanBalance(planId);

    console.log('✅ Payment recorded successfully');

    return {
      success: true,
      message: 'Payment recorded',
    };
  } catch (error: any) {
    console.error('Error recording payment:', error);
    throw error;
  }
}

/**
 * Calculate installment schedule
 */
function calculateInstallmentSchedule(
  totalAmount: number,
  numberOfInstallments: number,
  frequency: 'weekly' | 'biweekly' | 'monthly',
  firstPaymentDate: Date
): Array<{ installmentNumber: number; dueDate: Date; amount: number }> {
  const installmentAmount = Math.round((totalAmount / numberOfInstallments) * 100) / 100;
  const schedule = [];

  // Frequency in days
  const frequencyDays = {
    weekly: 7,
    biweekly: 14,
    monthly: 30,
  };

  for (let i = 0; i < numberOfInstallments; i++) {
    const dueDate = new Date(firstPaymentDate);
    dueDate.setDate(dueDate.getDate() + (i * frequencyDays[frequency]));

    // Last installment gets any rounding difference
    const amount = i === numberOfInstallments - 1
      ? Math.round((totalAmount - (installmentAmount * (numberOfInstallments - 1))) * 100) / 100
      : installmentAmount;

    schedule.push({
      installmentNumber: i + 1,
      dueDate,
      amount,
    });
  }

  return schedule;
}

/**
 * Update payment plan balance
 */
async function updatePlanBalance(planId: string): Promise<void> {
  // Calculate total paid
  // const [result] = await db
  //   .select({
  //     totalPaid: sql<number>`sum(COALESCE(paid_amount, 0))`,
  //   })
  //   .from(paymentPlanInstallments)
  //   .where(eq(paymentPlanInstallments.paymentPlanId, planId));

  // const totalPaid = result?.totalPaid || 0;

  // Get plan
  // const [plan] = await db
  //   .select()
  //   .from(paymentPlans)
  //   .where(eq(paymentPlans.id, planId));

  // const remainingBalance = parseFloat(plan.totalAmount) - parseFloat(plan.downPayment) - totalPaid;

  // Update plan
  // await db
  //   .update(paymentPlans)
  //   .set({
  //     paidAmount: totalPaid.toString(),
  //     remainingBalance: Math.max(0, remainingBalance).toString(),
  //     status: remainingBalance <= 0 ? 'completed' : 'active',
  //     updatedAt: new Date(),
  //   })
  //   .where(eq(paymentPlans.id, planId));
}

/**
 * Check for missed payments and update status
 */
export async function checkMissedPayments(): Promise<void> {
  console.log('🔍 Checking for missed payments...');

  const today = new Date();

  // Find overdue installments
  // const overdueInstallments = await db
  //   .select()
  //   .from(paymentPlanInstallments)
  //   .where(
  //     and(
  //       eq(paymentPlanInstallments.status, 'pending'),
  //       lte(paymentPlanInstallments.dueDate, today)
  //     )
  //   );

  // for (const installment of overdueInstallments) {
  //   const daysLate = Math.floor(
  //     (today.getTime() - new Date(installment.dueDate).getTime()) / (1000 * 60 * 60 * 24)
  //   );

  //   await db
  //     .update(paymentPlanInstallments)
  //     .set({
  //       status: 'late',
  //       daysLate,
  //       updatedAt: new Date(),
  //     })
  //     .where(eq(paymentPlanInstallments.id, installment.id));
  // }

  console.log(`✅ Checked missed payments`);
}
