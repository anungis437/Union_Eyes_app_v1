import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { duesTransactions, members } from '@/services/financial-service/src/db/schema';
import { and, desc } from 'drizzle-orm';
import { logApiAuditEvent } from '@/lib/middleware/request-validation';
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';
import { checkRateLimit, RATE_LIMITS, createRateLimitHeaders } from '@/lib/rate-limiter';
import { withRLSContext } from '@/lib/db/with-rls-context';

import { standardSuccessResponse } from '@/lib/api/standardized-responses';
// Validation schema for query parameters
const paymentHistorySchema = z.object({
  userId: z.string().min(1, 'userId parameter is required'),
});

export const GET = withEnhancedRoleAuth(60, async (request, context) => {
  const parsed = paymentHistorySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) {
    return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid request parameters'
    );
  }

  const query = parsed.data;
  const { userId, organizationId } = context;

  // Rate limiting: 100 financial read operations per hour per user
  const rateLimitResult = await checkRateLimit(userId, RATE_LIMITS.FINANCIAL_READ);
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { 
        error: 'Rate limit exceeded. Too many financial read requests.',
        resetIn: rateLimitResult.resetIn 
      },
      { 
        status: 429,
        headers: createRateLimitHeaders(rateLimitResult),
      }
    );
  }

  const orgId = (query as Record<string, unknown>)["organizationId"] ?? (query as Record<string, unknown>)["orgId"] ?? (query as Record<string, unknown>)["organization_id"] ?? (query as Record<string, unknown>)["org_id"] ?? (query as Record<string, unknown>)["unionId"] ?? (query as Record<string, unknown>)["union_id"] ?? (query as Record<string, unknown>)["localId"] ?? (query as Record<string, unknown>)["local_id"];
  if (typeof orgId === 'string' && orgId.length > 0 && orgId !== context.organizationId) {
    return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Forbidden'
    );
  }

try {
      const requestedUserId = query.userId;

      // Get member record
      const [member] = await withRLSContext({ organizationId }, async (db) => {
        return await db
          .select()
          .from(members)
          .where(eq(members.userId, requestedUserId))
          .limit(1);
      });

      if (!member) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(), userId,
          endpoint: '/api/dues/payment-history',
          method: 'GET',
          eventType: 'auth_failed',
          severity: 'medium',
          details: { reason: 'Member not found', requestedUserId },
        });
        return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Member not found'
    );
      }

      // Get payment history
      const payments = await withRLSContext({ organizationId }, async (db) => {
        return await db
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
      });

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

      logApiAuditEvent({
        timestamp: new Date().toISOString(), userId,
        endpoint: '/api/dues/payment-history',
        method: 'GET',
        eventType: 'success',
        severity: 'high',
        details: {
          dataType: 'FINANCIAL',
          requestedUserId,
          memberId: member.id,
          paymentsCount: formattedPayments.length,
        },
      });

      return NextResponse.json(formattedPayments);

    } catch (error) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(), userId,
        endpoint: '/api/dues/payment-history',
        method: 'GET',
        eventType: 'error',
        severity: 'high',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      });
      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Internal server error',
      error
    );
    }
});


