import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { members, duesTransactions } from '@/services/financial-service/src/db/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { stripe } from '@/lib/stripe';

// Bank reconciliation - compare Stripe payouts with recorded transactions
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get member to verify tenant
    const [member] = await db
      .select()
      .from(members)
      .where(eq(members.userId, userId))
      .limit(1);

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      );
    }

    const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
    const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000);

    // Get Stripe payouts for the date range
    const payouts = await stripe.payouts.list({
      created: {
        gte: startTimestamp,
        lte: endTimestamp,
      },
      limit: 100,
    });

    // Get transactions from database for the same period
    const [transactionsSummary] = await db
      .select({
        totalAmount: sql<string>`COALESCE(SUM(CAST(${duesTransactions.totalAmount} AS NUMERIC)), 0)`,
        transactionCount: sql<number>`COUNT(*)`,
      })
      .from(duesTransactions)
      .where(
        and(
          eq(duesTransactions.tenantId, member.tenantId),
          eq(duesTransactions.status, 'completed'),
          gte(duesTransactions.paymentDate, new Date(startDate)),
          lte(duesTransactions.paymentDate, new Date(endDate))
        )
      );

    const expectedAmount = parseFloat(transactionsSummary.totalAmount || '0');
    const transactionCount = transactionsSummary.transactionCount;

    // Calculate actual payout amounts from Stripe
    let actualPayoutAmount = 0;
    let stripeFees = 0;
    const payoutDetails = [];

    for (const payout of payouts.data) {
      const payoutAmount = payout.amount / 100; // Convert from cents
      actualPayoutAmount += payoutAmount;

      // Get balance transactions for this payout to calculate fees
      const balanceTransactions = await stripe.balanceTransactions.list({
        payout: payout.id,
        limit: 100,
      });

      let payoutFees = 0;
      let payoutGrossAmount = 0;

      for (const txn of balanceTransactions.data) {
        payoutFees += txn.fee / 100;
        payoutGrossAmount += txn.amount / 100;
      }

      stripeFees += payoutFees;

      payoutDetails.push({
        id: payout.id,
        date: new Date(payout.created * 1000).toISOString(),
        amount: payoutAmount,
        grossAmount: payoutGrossAmount,
        fees: payoutFees,
        status: payout.status,
        arrivalDate: payout.arrival_date ? new Date(payout.arrival_date * 1000).toISOString() : null,
        transactionCount: balanceTransactions.data.length,
      });
    }

    // Calculate total gross (before fees)
    const totalGross = actualPayoutAmount + stripeFees;

    // Calculate variance
    const variance = expectedAmount - totalGross;
    const variancePercentage = expectedAmount > 0 ? (variance / expectedAmount) * 100 : 0;

    return NextResponse.json({
      period: {
        startDate,
        endDate,
      },
      database: {
        totalAmount: expectedAmount,
        transactionCount,
      },
      stripe: {
        payoutCount: payouts.data.length,
        totalPayoutAmount: actualPayoutAmount,
        totalGross,
        totalFees: stripeFees,
        averageFeePercentage: totalGross > 0 ? (stripeFees / totalGross) * 100 : 0,
      },
      reconciliation: {
        variance,
        variancePercentage: variancePercentage.toFixed(2),
        isReconciled: Math.abs(variance) < 1, // Consider reconciled if within $1
        discrepancies: Math.abs(variance) >= 1 ? [
          {
            type: 'amount_mismatch',
            expected: expectedAmount,
            actual: totalGross,
            difference: variance,
          },
        ] : [],
      },
      payouts: payoutDetails,
    });

  } catch (error) {
    console.error('Bank reconciliation error:', error);
    return NextResponse.json(
      { error: 'Failed to perform bank reconciliation' },
      { status: 500 }
    );
  }
}
