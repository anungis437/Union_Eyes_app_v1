/**
 * Member Dues API
 * Fetch dues transactions for authenticated member
 * 
 * GET /api/members/dues - Get member's dues transactions
 * @module app/api/members/dues/route
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { duesTransactions } from '@/db/schema/domains/finance/dues';
import { and, desc } from 'drizzle-orm';
import { withApiAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { logger } from '@/lib/logger';

export const maxDuration = 30;

/**
 * GET /api/members/dues
 * Get member's dues transactions with optional filtering
 * 
 * Query params:
 * - status: Filter by status (pending, paid, overdue, etc.)
 * - limit: Number of records to return (default: 50)
 * - offset: Pagination offset (default: 0)
 */
export const GET = withApiAuth(async (request: NextRequest) => {
  try {
    // Get current user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Build where conditions
    const conditions = [eq(duesTransactions.memberId, user.id)];
    
    if (status) {
      conditions.push(eq(duesTransactions.status, status));
    }

    // Fetch transactions
    const transactions = await db
      .select({
        id: duesTransactions.id,
        organizationId: duesTransactions.organizationId,
        transactionType: duesTransactions.transactionType,
        periodStart: duesTransactions.periodStart,
        periodEnd: duesTransactions.periodEnd,
        dueDate: duesTransactions.dueDate,
        status: duesTransactions.status,
        duesAmount: duesTransactions.duesAmount,
        copeAmount: duesTransactions.copeAmount,
        pacAmount: duesTransactions.pacAmount,
        strikeFundAmount: duesTransactions.strikeFundAmount,
        lateFeeAmount: duesTransactions.lateFeeAmount,
        adjustmentAmount: duesTransactions.adjustmentAmount,
        totalAmount: duesTransactions.totalAmount,
        paidDate: duesTransactions.paidDate,
        paymentMethod: duesTransactions.paymentMethod,
        processorType: duesTransactions.processorType,
        receiptUrl: duesTransactions.receiptUrl,
        createdAt: duesTransactions.createdAt,
        metadata: duesTransactions.metadata,
      })
      .from(duesTransactions)
      .where(and(...conditions))
      .orderBy(desc(duesTransactions.createdAt))
      .limit(limit)
      .offset(offset);

    // Calculate summary statistics
    const summary = await db
      .select({
        totalPending: sql<string>`COALESCE(SUM(CASE WHEN ${duesTransactions.status} = 'pending' THEN CAST(${duesTransactions.totalAmount} AS NUMERIC) ELSE 0 END), 0)`,
        totalOverdue: sql<string>`COALESCE(SUM(CASE WHEN ${duesTransactions.status} = 'overdue' THEN CAST(${duesTransactions.totalAmount} AS NUMERIC) ELSE 0 END), 0)`,
        totalPaid: sql<string>`COALESCE(SUM(CASE WHEN ${duesTransactions.status} = 'paid' THEN CAST(${duesTransactions.totalAmount} AS NUMERIC) ELSE 0 END), 0)`,
        countPending: sql<number>`COUNT(CASE WHEN ${duesTransactions.status} = 'pending' THEN 1 END)`,
        countOverdue: sql<number>`COUNT(CASE WHEN ${duesTransactions.status} = 'overdue' THEN 1 END)`,
        countPaid: sql<number>`COUNT(CASE WHEN ${duesTransactions.status} = 'paid' THEN 1 END)`,
        nextDueDate: sql<string>`MIN(CASE WHEN ${duesTransactions.status} = 'pending' AND ${duesTransactions.dueDate} >= CURRENT_DATE THEN ${duesTransactions.dueDate} END)`,
      })
      .from(duesTransactions)
      .where(eq(duesTransactions.memberId, user.id));

    const summaryData = summary[0] || {
      totalPending: '0',
      totalOverdue: '0',
      totalPaid: '0',
      countPending: 0,
      countOverdue: 0,
      countPaid: 0,
      nextDueDate: null,
    };

    logger.info('Fetched member dues transactions', {
      userId: user.id,
      transactionCount: transactions.length,
      status,
    });

    return NextResponse.json({
      transactions,
      summary: {
        totalPending: parseFloat(summaryData.totalPending),
        totalOverdue: parseFloat(summaryData.totalOverdue),
        totalPaid: parseFloat(summaryData.totalPaid),
        countPending: summaryData.countPending,
        countOverdue: summaryData.countOverdue,
        countPaid: summaryData.countPaid,
        nextDueDate: summaryData.nextDueDate,
      },
      pagination: {
        limit,
        offset,
        total: transactions.length,
      },
    });
  } catch (error) {
    logger.error('Error fetching member dues transactions', { error });
    return NextResponse.json(
      { error: 'Failed to fetch dues transactions' },
      { status: 500 }
    );
  }
});
