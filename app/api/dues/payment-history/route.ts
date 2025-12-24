import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { duesTransactions, members } from '@/services/financial-service/src/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const requestedUserId = searchParams.get('userId');

    if (!requestedUserId) {
      return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 });
    }

    // Get member record
    const [member] = await db
      .select()
      .from(members)
      .where(eq(members.userId, requestedUserId))
      .limit(1);

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Get payment history
    const payments = await db
      .select({
        id: duesTransactions.id,
        date: duesTransactions.createdAt,
        amount: duesTransactions.amount,
        duesAmount: duesTransactions.duesAmount,
        copeAmount: duesTransactions.copeAmount,
        pacAmount: duesTransactions.pacAmount,
        strikeFundAmount: duesTransactions.strikeFundAmount,
        lateFeeAmount: duesTransactions.lateFeeAmount,
        adjustmentAmount: duesTransactions.adjustmentAmount,
        totalAmount: duesTransactions.totalAmount,
        status: duesTransactions.status,
        paymentMethod: duesTransactions.paymentMethod,
        periodStart: duesTransactions.periodStart,
        periodEnd: duesTransactions.periodEnd,
        paidDate: duesTransactions.paidDate,
        paymentReference: duesTransactions.paymentReference,
        receiptUrl: duesTransactions.receiptUrl,
      })
      .from(duesTransactions)
      .where(eq(duesTransactions.memberId, member.id))
      .orderBy(desc(duesTransactions.createdAt))
      .limit(50);

    const formattedPayments = payments.map(payment => ({
      id: payment.id,
      date: payment.paidDate || payment.date,
      amount: parseFloat(payment.amount.toString()),
      duesAmount: parseFloat(payment.duesAmount?.toString() || '0'),
      copeAmount: parseFloat(payment.copeAmount?.toString() || '0'),
      pacAmount: parseFloat(payment.pacAmount?.toString() || '0'),
      strikeFundAmount: parseFloat(payment.strikeFundAmount?.toString() || '0'),
      lateFeeAmount: parseFloat(payment.lateFeeAmount?.toString() || '0'),
      adjustmentAmount: parseFloat(payment.adjustmentAmount?.toString() || '0'),
      totalAmount: parseFloat(payment.totalAmount?.toString() || payment.amount.toString()),
      status: payment.status,
      paymentMethod: payment.paymentMethod || 'N/A',
      periodStart: payment.periodStart,
      periodEnd: payment.periodEnd,
      receiptUrl: payment.receiptUrl,
    }));

    return NextResponse.json(formattedPayments);

  } catch (error) {
    console.error('Error fetching payment history:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
