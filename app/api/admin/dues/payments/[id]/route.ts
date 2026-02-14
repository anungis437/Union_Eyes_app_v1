/**
 * Admin Payment Detail API
 * 
 * GET /api/admin/dues/payments/[id]
 * Returns detailed information about a specific payment transaction
 * 
 * @module app/api/admin/dues/payments/[id]
 */

import { db } from '@/db';
import { duesTransactions } from '@/db/schema/domains/finance/dues';
import { organizationMembers } from '@/db/schema-organizations';
import { users } from '@/db/schema/domains/member/user-management';
import { auditLogs } from '@/db/schema/audit-security-schema';
import { withApiAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { standardSuccessResponse, standardErrorResponse, ErrorCode
} from '@/lib/api/standardized-responses';
import { and, eq, desc } from 'drizzle-orm';
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
    const paymentDetail = await withRLSContext(async (dbClient) => {
      // Get payment transaction with member details
      const [paymentWithMember] = await dbClient
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
          // Member details from users table
          memberFirstName: users.firstName,
          memberLastName: users.lastName,
          memberEmail: users.email,
        })
        .from(duesTransactions)
        .leftJoin(users, eq(duesTransactions.memberId, users.userId))
        .where(eq(duesTransactions.id, paymentId))
        .limit(1);

      if (!paymentWithMember) {
        throw new Error('Payment not found');
      }

      // Format member name
      const firstName = paymentWithMember.memberFirstName as string | null;
      const lastName = paymentWithMember.memberLastName as string | null;
      const memberName = firstName && lastName 
        ? `${firstName} ${lastName}` 
        : firstName || lastName || 'Unknown Member';
      const memberEmail = (paymentWithMember.memberEmail as string) || '';

      // Get audit log entries for this payment
      const auditLogEntries = await dbClient
        .select({
          action: auditLogs.action,
          timestamp: auditLogs.createdAt,
          userId: auditLogs.userId,
          userName: users.displayName,
          userEmail: users.email,
          outcome: auditLogs.outcome,
          metadata: auditLogs.metadata,
        })
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.userId, users.userId))
        .where(
          and(
            eq(auditLogs.resourceType, 'dues_transaction'),
            eq(auditLogs.resourceId, paymentId)
          )
        )
        .orderBy(desc(auditLogs.createdAt))
        .limit(50);

      const auditLog = auditLogEntries.map((entry) => {
        const metadata = (entry.metadata || {}) as Record<string, unknown>;
        return {
          action: entry.action,
          timestamp: entry.timestamp ? new Date(entry.timestamp).toISOString() : new Date().toISOString(),
          userId: entry.userId || 'system',
          userName: entry.userName || entry.userEmail || 'System',
          details: metadata.details || entry.action || 'Action performed',
        };
      });

      const metadata = (paymentWithMember.metadata || {}) as Record<string, unknown>;

      const result: PaymentDetail = {
        id: paymentWithMember.id,
        memberId: paymentWithMember.memberId,
        memberName,
        memberEmail,
        amount: Number(paymentWithMember.totalAmount) || 0,
        status: paymentWithMember.status,
        dueDate: paymentWithMember.dueDate,
        paidDate: paymentWithMember.paidDate ? new Date(paymentWithMember.paidDate).toISOString() : null,
        paymentMethod: paymentWithMember.paymentMethod,
        transactionReference: paymentWithMember.paymentReference,
        createdAt: paymentWithMember.createdAt ? new Date(paymentWithMember.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: paymentWithMember.updatedAt ? new Date(paymentWithMember.updatedAt).toISOString() : new Date().toISOString(),
        breakdown: {
          duesAmount: Number(paymentWithMember.duesAmount) || 0,
          copeAmount: Number(paymentWithMember.copeAmount) || 0,
          pacAmount: Number(paymentWithMember.pacAmount) || 0,
          strikeFundAmount: Number(paymentWithMember.strikeFundAmount) || 0,
          lateFees: Number(paymentWithMember.lateFeeAmount) || 0,
        },
        metadata: {
          frequency: metadata.frequency || 'monthly',
          periodStart: paymentWithMember.periodStart,
          periodEnd: paymentWithMember.periodEnd,
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
