/**
 * Admin Payment Detail API
 * 
 * GET /api/admin/dues/payments/[id]
 * Returns detailed information about a specific payment transaction
 * 
 * @module app/api/admin/dues/payments/[id]
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
import { eq, and } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { withRLSContext } from '@/lib/db/with-rls-context';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

export const runtime = 'nodejs';

// =============================================================================
// TYPES
// =============================================================================

interface PaymentDetail {
  id: string;
  memberId: string;
  memberName: string;
  memberEmail: string;
  amount: number;
  status: string;
  dueDate: string;
  paidDate: string | null;
  paymentMethod: string | null;
  transactionReference: string | null;
  createdAt: string;
  updatedAt: string;
  breakdown: {
    duesAmount: number;
    copeAmount: number;
    pacAmount: number;
    strikeFundAmount: number;
    lateFees: number;
  };
  metadata: {
    frequency: string;
    periodStart: string;
    periodEnd: string;
    invoiceNumber: string | null;
  };
  auditLog: Array<{
    action: string;
    timestamp: string;
    userId: string;
    userName: string;
    details: string;
  }>;
}

// =============================================================================
// GET HANDLER
// =============================================================================

export const GET = withApiAuth(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  const user = await getCurrentUser();

  if (!user) {
    return standardErrorResponse(
      ErrorCode.AUTH_REQUIRED,
      'Authentication required'
    );
  }

  const paymentId = params.id;

  logger.info('Fetching admin payment detail', {
    userId: user.id,
    paymentId,
  });

  try {
    const paymentDetail = await withRLSContext(async (dbClient: NodePgDatabase<any>) => {
      // Get payment transaction
      const [payment] = await dbClient
        .select({
          id: duesTransactions.id,
          memberId: duesTransactions.memberId,
          organizationId: duesTransactions.organizationId,
          totalAmount: duesTransactions.totalAmount,
          status: duesTransactions.status,
          dueDate: duesTransactions.dueDate,
          paidDate: duesTransactions.paidDate,
          paymentMethod: duesTransactions.paymentMethod,
          paymentReference: duesTransactions.paymentReference,
          createdAt: duesTransactions.createdAt,
          updatedAt: duesTransactions.updatedAt,
          duesAmount: duesTransactions.duesAmount,
          copeAmount: duesTransactions.copeAmount,
          pacAmount: duesTransactions.pacAmount,
          strikeFundAmount: duesTransactions.strikeFundAmount,
          lateFeeAmount: duesTransactions.lateFeeAmount,
          periodStart: duesTransactions.periodStart,
          periodEnd: duesTransactions.periodEnd,
          metadata: duesTransactions.metadata,
        })
        .from(duesTransactions)
        .where(eq(duesTransactions.id, paymentId))
        .limit(1);

      if (!payment) {
        throw new Error('Payment not found');
      }

      // Get member information
      // TODO: In production, join with users table to get full name and email
      const memberName = payment.memberId;
      const memberEmail = '';

      // TODO: Get audit log entries for this payment
      // This would require an audit_logs table
      const auditLog: any[] = [];

      const metadata = (payment.metadata || {}) as any;

      const result: PaymentDetail = {
        id: payment.id,
        memberId: payment.memberId,
        memberName,
        memberEmail,
        amount: Number(payment.totalAmount) || 0,
        status: payment.status,
        dueDate: payment.dueDate,
        paidDate: payment.paidDate ? new Date(payment.paidDate).toISOString() : null,
        paymentMethod: payment.paymentMethod,
        transactionReference: payment.paymentReference,
        createdAt: payment.createdAt ? new Date(payment.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: payment.updatedAt ? new Date(payment.updatedAt).toISOString() : new Date().toISOString(),
        breakdown: {
          duesAmount: Number(payment.duesAmount) || 0,
          copeAmount: Number(payment.copeAmount) || 0,
          pacAmount: Number(payment.pacAmount) || 0,
          strikeFundAmount: Number(payment.strikeFundAmount) || 0,
          lateFees: Number(payment.lateFeeAmount) || 0,
        },
        metadata: {
          frequency: metadata.frequency || 'monthly',
          periodStart: payment.periodStart,
          periodEnd: payment.periodEnd,
          invoiceNumber: metadata.invoiceNumber || null,
        },
        auditLog,
      };

      return result;
    });

    return standardSuccessResponse(paymentDetail);
  } catch (error) {
    logger.error('Error fetching payment detail', { error, paymentId });
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch payment detail'
    );
  }
});
