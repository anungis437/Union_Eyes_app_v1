import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { arrearsCases, members, duesTransactions } from '@/services/financial-service/src/db/schema';
import { eq, and } from 'drizzle-orm';

// Create a payment plan for an arrears case
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get member to verify tenant
    const [currentMember] = await db
      .select()
      .from(members)
      .where(eq(members.userId, userId))
      .limit(1);

    if (!currentMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const body = await req.json();
    const { memberId, installmentAmount, frequency, startDate } = body;

    // Validate required fields
    if (!memberId || !installmentAmount || !frequency || !startDate) {
      return NextResponse.json(
        { error: 'memberId, installmentAmount, frequency, and startDate are required' },
        { status: 400 }
      );
    }

    // Validate frequency
    const validFrequencies = ['weekly', 'biweekly', 'monthly'];
    if (!validFrequencies.includes(frequency)) {
      return NextResponse.json(
        { error: 'frequency must be weekly, biweekly, or monthly' },
        { status: 400 }
      );
    }

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
      return NextResponse.json({ error: 'Arrears case not found' }, { status: 404 });
    }

    // Calculate number of installments (round up)
    const totalOwed = parseFloat(arrearsCase.remainingBalance || arrearsCase.totalOwed);
    const installmentAmountNum = parseFloat(installmentAmount);
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
        paymentPlanAmount: installmentAmount,
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

    await db.insert(duesTransactions).values(installmentTransactions);

    return NextResponse.json({
      message: 'Payment plan created successfully',
      case: updatedCase,
      paymentSchedule,
      numberOfInstallments,
      totalOwed,
    });

  } catch (error) {
    console.error('Create payment plan error:', error);
    return NextResponse.json(
      { error: 'Failed to create payment plan' },
      { status: 500 }
    );
  }
}
