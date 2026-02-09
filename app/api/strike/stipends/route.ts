/**
 * API Route: Strike Stipend Calculation
 * Calculate weekly strike stipend amounts
 * Phase 4: Strike Fund Management
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db/db';
import { sql } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { checkRateLimit, RATE_LIMITS, createRateLimitHeaders } from '@/lib/rate-limiter';
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { logApiAuditEvent } from '@/lib/middleware/request-validation';

export const dynamic = 'force-dynamic';

// Validation schema for stipend calculation
const calculateStipendSchema = z.object({
  strikeFundId: z.string().uuid('Invalid strike fund ID format'),
  memberId: z.string().uuid('Invalid member ID format'),
  weekStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Week start date must be in YYYY-MM-DD format'),
  weekEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Week end date must be in YYYY-MM-DD format'),
});

/**
 * POST /api/strike/stipends
 * Calculate strike stipend amount for a member
 * Uses the calculate_stipend_amount database function
 */
export const POST = withRoleAuth('steward', async (request, context) => {
  try {
    const body = await request.json();
    const parsed = calculateStipendSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

      // Rate limiting: 5 stipend requests per hour per user (very strict for financial operations)
      const rateLimitResult = await checkRateLimit(context.userId, RATE_LIMITS.STRIKE_STIPEND);
      if (!rateLimitResult.allowed) {
        logger.warn('Rate limit exceeded for strike stipend calculation', {
          userId: context.userId,
          limit: rateLimitResult.limit,
          resetIn: rateLimitResult.resetIn,
        });
        
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId: context.userId,
          endpoint: '/api/strike/stipends',
          method: 'POST',
          eventType: 'auth_failed',
          severity: 'high',
          details: { 
            reason: 'Rate limit exceeded',
            resetIn: rateLimitResult.resetIn,
          },
        });

        return NextResponse.json(
          { 
            error: 'Rate limit exceeded. Too many stipend requests. Please try again later.',
            resetIn: rateLimitResult.resetIn 
          },
          { 
            status: 429,
            headers: createRateLimitHeaders(rateLimitResult),
          }
        );
      }

      const { strikeFundId, memberId, weekStartDate, weekEndDate } = parsed.data;

      // Call database function
      const result = await db.execute(
        sql`SELECT calculate_stipend_amount(
          ${strikeFundId}::uuid, 
          ${memberId}::uuid, 
          ${weekStartDate}::date, 
          ${weekEndDate}::date
        ) as stipend_amount`
      );

      const stipendAmount = result[0]?.stipend_amount;
      const calculatedAmount = stipendAmount ? parseFloat(stipendAmount as string) : 0;

      // Log financial transaction - stipend calculated
      logger.info('Financial transaction - stipend calculated', {
        userId: context.userId,
        strikeFundId,
        memberId,
        weekStartDate,
        weekEndDate,
        stipendAmount: calculatedAmount,
        dataType: 'FINANCIAL',
        transactionType: 'STIPEND_CALCULATED',
        correlationId: request.headers.get('x-correlation-id'),
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      });

      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId: context.userId,
        endpoint: '/api/strike/stipends',
        method: 'POST',
        eventType: 'success',
        severity: 'high',
        details: {
          dataType: 'FINANCIAL',
          strikeFundId,
          memberId,
          weekStartDate,
          weekEndDate,
          stipendAmount: calculatedAmount,
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          strikeFundId,
          memberId,
          weekStartDate,
          weekEndDate,
          stipendAmount: calculatedAmount,
        },
      });

  } catch (error) {
    logger.error('Failed to calculate strike stipend', error as Error, {
      userId: context.userId,
      correlationId: request.headers.get('x-correlation-id'),
    });

    logApiAuditEvent({
      timestamp: new Date().toISOString(),
      userId: context.userId,
      endpoint: '/api/strike/stipends',
      method: 'POST',
      eventType: 'error',
      severity: 'high',
      details: { 
        dataType: 'FINANCIAL',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
