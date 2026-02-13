/**
 * Admin Dues Overview API
 * 
 * GET /api/admin/dues/overview - Get comprehensive dues statistics
 * 
 * Returns:
 * - Financial KPIs (total collected, outstanding, overdue)
 * - Recent payments
 * - Billing cycle status
 * - Payment statistics by status
 * 
 * @module app/api/admin/dues/overview
 */

import { NextRequest } from 'next/server';
import { db } from '@/db';
import { duesTransactions } from '@/db/schema/domains/finance/dues';
import { organizationMembers } from '@/db/schema-organizations';
import { withApiAuth, getCurrentUser } from '@/lib/api-auth-guard';
import {
  standardErrorResponse,
  standardSuccessResponse,
  ErrorCode,
} from '@/lib/api/standardized-responses';
import { eq, and, gte, lte, sql, desc, inArray } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { withRLSContext } from '@/lib/db/with-rls-context';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

export const runtime = 'nodejs';

// =============================================================================
// TYPES
// =============================================================================

interface OverviewStats {
  financialKpis: {
    totalCollected: number;
    totalOutstanding: number;
    totalOverdue: number;
    currentBalance: number;
  };
  paymentStats: {
    pending: number;
    paid: number;
    overdue: number;
    total: number;
  };
  recentPayments: Array<{
    id: string;
    memberName: string;
    amount: number;
    status: string;
    paidDate: string | null;
    dueDate: string;
  }>;
  periodStats: {
    thisMonth: {
      collected: number;
      outstanding: number;
      transactionCount: number;
    };
    lastMonth: {
      collected: number;
      outstanding: number;
      transactionCount: number;
    };
  };
}

// =============================================================================
// GET - Admin Dues Overview
// =============================================================================

export const GET = withApiAuth(async (request: NextRequest) => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return standardErrorResponse(
        ErrorCode.AUTH_REQUIRED,
        'Authentication required'
      );
    }

    // Get organization ID from user metadata or query params
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId') || user.organizationId;

    if (!organizationId) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'organizationId is required'
      );
    }

    logger.info('Fetching admin dues overview', {
      userId: user.id,
      organizationId,
    });

    const overview = await withRLSContext(async (dbClient: NodePgDatabase<any>) => {
      // Get current date ranges
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

      // =======================================================================
      // 1. Financial KPIs
      // =======================================================================

      const kpiResults = await dbClient
        .select({
          status: duesTransactions.status,
          totalAmount: sql<number>`SUM(CAST(${duesTransactions.totalAmount} AS NUMERIC))`,
          count: sql<number>`COUNT(*)`,
        })
        .from(duesTransactions)
        .where(eq(duesTransactions.organizationId, organizationId))
        .groupBy(duesTransactions.status);

      let totalCollected = 0;
      let totalOutstanding = 0;
      let totalOverdue = 0;

      for (const row of kpiResults) {
        const amount = Number(row.totalAmount) || 0;
        
        if (row.status === 'paid') {
          totalCollected += amount;
        } else if (row.status === 'pending') {
          totalOutstanding += amount;
        } else if (row.status === 'overdue') {
          totalOverdue += amount;
        }
      }

      const currentBalance = totalOutstanding + totalOverdue;

      // =======================================================================
      // 2. Payment Statistics
      // =======================================================================

      const paymentStats = {
        pending: kpiResults.find((r: any) => r.status === 'pending')?.count || 0,
        paid: kpiResults.find((r: any) => r.status === 'paid')?.count || 0,
        overdue: kpiResults.find((r: any) => r.status === 'overdue')?.count || 0,
        total: kpiResults.reduce((sum: number, r: any) => sum + (Number(r.count) || 0), 0),
      };

      // =======================================================================
      // 3. Recent Payments (Last 10)
      // =======================================================================

      const recentPaymentsData = await dbClient
        .select({
          id: duesTransactions.id,
          memberId: duesTransactions.memberId,
          totalAmount: duesTransactions.totalAmount,
          status: duesTransactions.status,
          paidDate: duesTransactions.paidDate,
          dueDate: duesTransactions.dueDate,
          createdAt: duesTransactions.createdAt,
        })
        .from(duesTransactions)
        .where(eq(duesTransactions.organizationId, organizationId))
        .orderBy(desc(duesTransactions.createdAt))
        .limit(10);

      // Get member names
      const memberIds = [...new Set(recentPaymentsData.map((p: any) => p.memberId))];
      const members = await dbClient
        .select({
          id: organizationMembers.id,
          userId: organizationMembers.userId,
        })
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.organizationId, organizationId),
            inArray(organizationMembers.userId, memberIds)
          )
        );

      // Map member IDs to names (for now, use member ID; in production, fetch from users table)
      const memberMap = new Map(members.map((m: any) => [m.userId, m.userId]));

      const recentPayments = recentPaymentsData.map((payment: any) => ({
        id: payment.id,
        memberName: memberMap.get(payment.memberId) || 'Unknown Member',
        amount: Number(payment.totalAmount) || 0,
        status: payment.status,
        paidDate: payment.paidDate ? payment.paidDate.toISOString() : null,
        dueDate: payment.dueDate.toISOString(),
      }));

      // =======================================================================
      // 4. Period Statistics (This Month vs Last Month)
      // =======================================================================

      // This month
      const thisMonthResults = await dbClient
        .select({
          status: duesTransactions.status,
          totalAmount: sql<number>`SUM(CAST(${duesTransactions.totalAmount} AS NUMERIC))`,
          count: sql<number>`COUNT(*)`,
        })
        .from(duesTransactions)
        .where(
          and(
            eq(duesTransactions.organizationId, organizationId),
            gte(duesTransactions.createdAt, startOfMonth),
            lte(duesTransactions.createdAt, endOfMonth)
          )
        )
        .groupBy(duesTransactions.status);

      const thisMonthCollected =
        Number(thisMonthResults.find((r: any) => r.status === 'paid')?.totalAmount) || 0;
      const thisMonthOutstanding =
        Number(thisMonthResults.find((r: any) => r.status === 'pending')?.totalAmount) || 0;
      const thisMonthCount = thisMonthResults.reduce(
        (sum: number, r: any) => sum + (Number(r.count) || 0),
        0
      );

      // Last month
      const lastMonthResults = await dbClient
        .select({
          status: duesTransactions.status,
          totalAmount: sql<number>`SUM(CAST(${duesTransactions.totalAmount} AS NUMERIC))`,
          count: sql<number>`COUNT(*)`,
        })
        .from(duesTransactions)
        .where(
          and(
            eq(duesTransactions.organizationId, organizationId),
            gte(duesTransactions.createdAt, startOfLastMonth),
            lte(duesTransactions.createdAt, endOfLastMonth)
          )
        )
        .groupBy(duesTransactions.status);

      const lastMonthCollected =
        Number(lastMonthResults.find((r: any) => r.status === 'paid')?.totalAmount) || 0;
      const lastMonthOutstanding =
        Number(lastMonthResults.find((r: any) => r.status === 'pending')?.totalAmount) || 0;
      const lastMonthCount = lastMonthResults.reduce(
        (sum: number, r: any) => sum + (Number(r.count) || 0),
        0
      );

      // =======================================================================
      // Return Overview
      // =======================================================================

      const overview: OverviewStats = {
        financialKpis: {
          totalCollected,
          totalOutstanding,
          totalOverdue,
          currentBalance,
        },
        paymentStats,
        recentPayments,
        periodStats: {
          thisMonth: {
            collected: thisMonthCollected,
            outstanding: thisMonthOutstanding,
            transactionCount: thisMonthCount,
          },
          lastMonth: {
            collected: lastMonthCollected,
            outstanding: lastMonthOutstanding,
            transactionCount: lastMonthCount,
          },
        },
      };

      return overview;
    });

    logger.info('Admin dues overview fetched successfully', {
      userId: user.id,
      organizationId,
      totalCollected: overview.financialKpis.totalCollected,
      totalOutstanding: overview.financialKpis.totalOutstanding,
    });

    return standardSuccessResponse(overview);
  } catch (error) {
    logger.error('Error fetching admin dues overview', { error });

    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      error instanceof Error ? error.message : 'Failed to fetch dues overview'
    );
  }
});
