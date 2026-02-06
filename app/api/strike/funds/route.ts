/**
 * API Route: Strike Funds
 * Manage strike funds for organizations
 * Phase 4: Strike Fund Management
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db/db';
import { strikeFunds } from '@/db/migrations/schema';
import { eq, and, desc } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { checkRateLimit, RATE_LIMITS, createRateLimitHeaders } from '@/lib/rate-limiter';

export const dynamic = 'force-dynamic';

/**
 * GET /api/strike/funds
 * List strike funds for an organization
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    // Rate limiting: 15 operations per hour per user
    const rateLimitResult = await checkRateLimit(userId, RATE_LIMITS.STRIKE_FUND);
    if (!rateLimitResult.allowed) {
      logger.warn('Rate limit exceeded for strike funds read', {        limit: rateLimitResult.limit,
        resetIn: rateLimitResult.resetIn,
      });
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded. Too many requests.',
          resetIn: rateLimitResult.resetIn 
        },
        { 
          status: 429,
          headers: createRateLimitHeaders(rateLimitResult),
        }
      );
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const status = searchParams.get('status');

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Bad Request - organizationId is required' },
        { status: 400 }
      );
    }

    // Build query conditions
    const conditions = [eq(strikeFunds.organizationId, organizationId)];
    
    if (status) {
      conditions.push(eq(strikeFunds.strikeStatus, status as any));
    }

    // Fetch strike funds
    const funds = await db
      .select()
      .from(strikeFunds)
      .where(and(...conditions))
      .orderBy(desc(strikeFunds.strikeStartDate));

    // Log financial data access - strike funds retrieved
    logger.info('Financial data accessed - strike funds list', {      fundCount: funds.length,
      status: status || 'all',
      dataType: 'FINANCIAL',
      operation: 'READ_STRIKE_FUNDS',
      correlationId: request.headers.get('x-correlation-id'),
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
    });

    return NextResponse.json({
      success: true,
      data: funds,
      count: funds.length,
    });

  } catch (error) {
    const { searchParams } = new URL(request.url);
    logger.error('Failed to fetch strike funds', error as Error, {
      userId: (await auth()).userId,
      organizationId: searchParams.get('organizationId'),
      correlationId: request.headers.get('x-correlation-id'),
    });
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/strike/funds
 * Create a new strike fund
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

    const body = await request.json();
    const {
      organizationId,      
      fundName,
      fundCode,
      strikeStartDate,
      targetFundAmount,
      weeklyStipendAmount,
      minimumPicketHours,
    } = body;

    // Validate required fields
    if (!organizationId || !fundName || !fundCode || !strikeStartDate) {
      return NextResponse.json(
        { error: 'Bad Request - organizationId, fundName, fundCode, and strikeStartDate are required' },
        { status: 400 }
      );
    }

    // Create strike fund
    const [newFund] = await db
      .insert(strikeFunds)
      .values({
        tenantId: organizationId,
        organizationId: organizationId,
        fundName,
        fundCode,
        fundType: 'strike', // Required field
        strikeStartDate: new Date(strikeStartDate).toISOString(),
        targetAmount: targetFundAmount,
        weeklyStipendAmount,
        minimumAttendanceHours: minimumPicketHours,
        strikeStatus: 'planned',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .returning();

    // Log financial transaction - strike fund created
    logger.info('Financial transaction - strike fund created', {
      fundId: newFund.id,
      fundName,
      fundCode,
      targetAmount: targetFundAmount,
      weeklyStipendAmount,
      strikeStartDate,
      strikeStatus: 'planned',
      dataType: 'FINANCIAL',
      transactionType: 'STRIKE_FUND_CREATED',
      correlationId: request.headers.get('x-correlation-id'),
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
    });

    return NextResponse.json({
      success: true,
      data: newFund,
      message: 'Strike fund created successfully',
    }, { status: 201 });

  } catch (error) {
    let errorBody;
    try {
      errorBody = await request.json();
    } catch {
      errorBody = {};
    }
    const body = errorBody;
    logger.error('Failed to create strike fund', error as Error, {
      userId: (await auth()).userId,
      organizationId: body.organizationId,
      fundCode: body.fundCode,
      correlationId: request.headers.get('x-correlation-id'),
    });
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
