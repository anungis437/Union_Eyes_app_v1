import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { duesTransactions, memberDuesAssignments, duesRules, members } from '@/services/financial-service/src/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

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

    // Get active dues assignment
    const [assignment] = await db
      .select({
        assignment: memberDuesAssignments,
        rule: duesRules,
      })
      .from(memberDuesAssignments)
      .leftJoin(duesRules, eq(memberDuesAssignments.ruleId, duesRules.id))
      .where(
        and(
          eq(memberDuesAssignments.memberId, member.id),
          eq(memberDuesAssignments.isActive, true)
        )
      )
      .orderBy(desc(memberDuesAssignments.effectiveDate))
      .limit(1);

    if (!assignment) {
      return NextResponse.json({
        currentBalance: 0,
        nextDueDate: null,
        nextDueAmount: 0,
        overdueAmount: 0,
        lastPaymentDate: null,
        lastPaymentAmount: 0,
        isInArrears: false,
        arrearsAmount: 0,
        membershipStatus: 'good_standing',
        autoPayEnabled: false,
        paymentMethodLast4: null,
      });
    }

    // Calculate current balance (sum of unpaid transactions)
    const [balanceResult] = await db
      .select({
        totalOwed: sql<number>`COALESCE(SUM(CAST(${duesTransactions.totalAmount} AS DECIMAL)), 0)`,
        overdueAmount: sql<number>`COALESCE(SUM(CASE WHEN ${duesTransactions.dueDate} < CURRENT_DATE AND ${duesTransactions.status} = 'pending' THEN CAST(${duesTransactions.totalAmount} AS DECIMAL) ELSE 0 END), 0)`,
      })
      .from(duesTransactions)
      .where(
        and(
          eq(duesTransactions.memberId, member.id),
          eq(duesTransactions.status, 'pending')
        )
      );

    // Get next upcoming payment
    const [nextPayment] = await db
      .select()
      .from(duesTransactions)
      .where(
        and(
          eq(duesTransactions.memberId, member.id),
          eq(duesTransactions.status, 'pending'),
          sql`${duesTransactions.dueDate} >= CURRENT_DATE`
        )
      )
      .orderBy(duesTransactions.dueDate)
      .limit(1);

    // Get last completed payment
    const [lastPayment] = await db
      .select()
      .from(duesTransactions)
      .where(
        and(
          eq(duesTransactions.memberId, member.id),
          eq(duesTransactions.status, 'completed')
        )
      )
      .orderBy(desc(duesTransactions.paidDate))
      .limit(1);

    const currentBalance = parseFloat(balanceResult.totalOwed.toString());
    const overdueAmount = parseFloat(balanceResult.overdueAmount.toString());
    const isInArrears = overdueAmount > 0;

    return NextResponse.json({
      currentBalance,
      nextDueDate: nextPayment?.dueDate || null,
      nextDueAmount: nextPayment?.totalAmount ? parseFloat(nextPayment.totalAmount.toString()) : 0,
      overdueAmount,
      lastPaymentDate: lastPayment?.paidDate || null,
      lastPaymentAmount: lastPayment?.totalAmount ? parseFloat(lastPayment.totalAmount.toString()) : 0,
      isInArrears,
      arrearsAmount: overdueAmount,
      membershipStatus: isInArrears ? 'arrears' : 'good_standing',
      autoPayEnabled: false, // TODO: Implement autopay settings table
      paymentMethodLast4: null, // TODO: Get from Stripe customer
    });

  } catch (error) {
    console.error('Error fetching dues balance:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
