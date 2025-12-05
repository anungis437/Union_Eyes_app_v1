/**
 * API Route: Strike Stipend Calculation
 * Calculate weekly strike stipend amounts
 * Phase 4: Strike Fund Management
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db/db';
import { sql } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { checkRateLimit, RATE_LIMITS, createRateLimitHeaders } from '@/lib/rate-limiter';

export const dynamic = 'force-dynamic';

/**
 * POST /api/strike/stipends
 * Calculate strike stipend amount for a member
 * Uses the calculate_stipend_amount database function
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    // Rate limiting: 5 stipend requests per hour per user (very strict for financial operations)
    const rateLimitResult = await checkRateLimit(userId, RATE_LIMITS.STRIKE_STIPEND);
    if (!rateLimitResult.allowed) {
      logger.warn('Rate limit exceeded for strike stipend calculation', {        limit: rateLimitResult.limit,
        resetIn: rateLimitResult.resetIn,
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

    const body = await request.json();
    const { strikeFundId, memberId, weekStartDate, weekEndDate } = body;

    if (!strikeFundId || !memberId || !weekStartDate || !weekEndDate) {
      return NextResponse.json(
        { error: 'Bad Request - strikeFundId, memberId, weekStartDate, and weekEndDate are required' },
        { status: 400 }
      );
    }

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
    logger.info('Financial transaction - stipend calculated', {      strikeFundId,
      memberId,
      weekStartDate,
      weekEndDate,
      stipendAmount: calculatedAmount,
      dataType: 'FINANCIAL',
      transactionType: 'STIPEND_CALCULATED',
      correlationId: request.headers.get('x-correlation-id'),
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
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
    let errorBody;
    try {
      errorBody = await request.json();
    } catch {
      errorBody = {};
    }
    const body = errorBody;
    logger.error('Failed to calculate strike stipend', error as Error, {
      userId: (await auth()).userId,
      strikeFundId: body.strikeFundId,
      memberId: body.memberId,
      correlationId: request.headers.get('x-correlation-id'),
    });
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
