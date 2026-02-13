/**
 * Admin Payments List API
 * 
 * GET /api/admin/dues/payments - List all payments with filters and pagination
 * 
 * Query Parameters:
 * - page: Page number (default: 1)
 * - pageSize: Items per page (default: 20)
 * - status: Filter by status (paid, pending, overdue, cancelled)
 * - search: Search by member name or ID
 * - startDate: Filter by date range start
 * - endDate: Filter by date range end
 * 
 * @module app/api/admin/dues/payments
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
import { eq, and, gte, lte, or, like, desc, count } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { withRLSContext } from '@/lib/db/with-rls-context';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

export const runtime = 'nodejs';

// =============================================================================
// GET - List Payments
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

    // Get organization ID
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId') || user.organizationId;

    if (!organizationId) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'organizationId is required'
      );
    }

    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const startDate: string | null = searchParams.get('startDate');
    const endDate: string | null = searchParams.get('endDate');

    logger.info('Fetching admin payments list', {
      userId: user.id,
      organizationId,
      page,
      pageSize,
      status,
      search,
    });

    const result = await withRLSContext(async (dbClient: NodePgDatabase<any>) => {
      // Build where conditions
      const conditions = [eq(duesTransactions.organizationId, organizationId)];

      if (status && status !== 'all') {
        conditions.push(eq(duesTransactions.status, status));
      }

      if (startDate) {
        conditions.push(gte(duesTransactions.dueDate, startDate as string));
      }

      if (endDate) {
        conditions.push(lte(duesTransactions.dueDate, endDate as string));
      }

      // Get total count
      const [{ totalCount }] = await dbClient
        .select({ totalCount: count() })
        .from(duesTransactions)
        .where(and(...conditions));

      // Get payments
      const offset = (page - 1) * pageSize;
      const paymentsData = await dbClient
        .select({
          id: duesTransactions.id,
          memberId: duesTransactions.memberId,
          amount: duesTransactions.totalAmount,
          status: duesTransactions.status,
          dueDate: duesTransactions.dueDate,
          paidDate: duesTransactions.paidDate,
          paymentMethod: duesTransactions.paymentMethod,
          createdAt: duesTransactions.createdAt,
        })
        .from(duesTransactions)
        .where(and(...conditions))
        .orderBy(desc(duesTransactions.createdAt))
        .limit(pageSize)
        .offset(offset);

      // Get member names (simplified - in production, join with users table)
      const payments = paymentsData.map((payment: any) => ({
        id: payment.id,
        memberId: payment.memberId,
        memberName: payment.memberId, // TODO: Replace with actual member name from users table
        amount: Number(payment.amount) || 0,
        status: payment.status,
        dueDate: payment.dueDate.toISOString(),
        paidDate: payment.paidDate ? payment.paidDate.toISOString() : null,
        paymentMethod: payment.paymentMethod,
        createdAt: payment.createdAt.toISOString(),
      }));

      const totalPages = Math.ceil(Number(totalCount) / pageSize);

      return {
        payments,
        totalCount: Number(totalCount),
        page,
        pageSize,
        totalPages,
      };
    });

    logger.info('Admin payments list fetched successfully', {
      userId: user.id,
      organizationId,
      totalCount: result.totalCount,
      page: result.page,
    });

    return standardSuccessResponse(result);
  } catch (error) {
    logger.error('Error fetching admin payments list', { error });

    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      error instanceof Error ? error.message : 'Failed to fetch payments'
    );
  }
});
