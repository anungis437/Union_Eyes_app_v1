/**
 * API Route: Strike Funds
 * Manage strike funds for organizations
 * Phase 4: Strike Fund Management
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { strikeFunds } from '@/db/migrations/schema';
import { eq, and, desc } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { checkRateLimit, RATE_LIMITS, createRateLimitHeaders } from '@/lib/rate-limiter';
import { z } from 'zod';
import { logApiAuditEvent } from '@/lib/middleware/api-security';
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';

export const dynamic = 'force-dynamic';

/**
 * Validation schemas
 */
const listFundsSchema = z.object({
  organizationId: z.string().uuid(),
  status: z.enum(['planned', 'active', 'ended']).optional(),
});

const createFundSchema = z.object({
  organizationId: z.string().uuid(),
  fundName: z.string().min(1),
  fundCode: z.string().min(1),
  strikeStartDate: z.string().datetime(),
  targetFundAmount: z.number().positive().optional(),
  weeklyStipendAmount: z.number().positive().optional(),
  minimumPicketHours: z.number().nonnegative().optional(),
});

/**
 * GET /api/strike/funds
 * List strike funds for an organization
 */
export const GET = withRoleAuth('steward', async (request, context) => {
  try {
    const queryResult = listFundsSchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams)
    );

    if (!queryResult.success) {
      return NextResponse.json(
        { error: 'Invalid request parameters' },
        { status: 400 }
      );
    }

    const { organizationId, status } = queryResult.data;

    if (organizationId !== context.organizationId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

      // Rate limiting: 15 operations per hour per user
      const rateLimitResult = await checkRateLimit(context.userId, RATE_LIMITS.STRIKE_FUND);
      if (!rateLimitResult.allowed) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId: context.userId,
          endpoint: '/api/strike/funds',
          method: 'GET',
          eventType: 'auth_failed',
          severity: 'high',
          details: {
            reason: 'Rate limit exceeded',
            limit: rateLimitResult.limit,
            resetIn: rateLimitResult.resetIn,
          },
        });

        return NextResponse.json(
          {
            error: 'Rate limit exceeded. Too many requests.',
            resetIn: rateLimitResult.resetIn,
          },
          {
            status: 429,
            headers: createRateLimitHeaders(rateLimitResult),
          }
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

      // Log financial data access
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId: context.userId,
        endpoint: '/api/strike/funds',
        method: 'GET',
        eventType: 'success',
        severity: 'high',
        details: {
          organizationId,
          fundCount: funds.length,
          status: status || 'all',
          dataType: 'FINANCIAL',
          operation: 'READ_STRIKE_FUNDS',
        },
      });

      return NextResponse.json({
        success: true,
        data: funds,
        count: funds.length,
      });
  } catch (error) {
    logApiAuditEvent({
      timestamp: new Date().toISOString(),
      userId: context.userId,
      endpoint: '/api/strike/funds',
      method: 'GET',
      eventType: 'auth_failed',
      severity: 'high',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    logger.error('Failed to fetch strike funds', error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

/**
 * POST /api/strike/funds
 * Create a new strike fund
 */
export const POST = withRoleAuth(90, async (request, context) => {
  try {
    const body = await request.json();
    const parsed = createFundSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const {
      organizationId,
      fundName,
      fundCode,
      strikeStartDate,
      targetFundAmount,
      weeklyStipendAmount,
      minimumPicketHours,
    } = parsed.data;

    if (organizationId !== context.organizationId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

      // Rate limiting for creation operations
      const rateLimitResult = await checkRateLimit(context.userId, RATE_LIMITS.STRIKE_FUND);
      if (!rateLimitResult.allowed) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId: context.userId,
          endpoint: '/api/strike/funds',
          method: 'POST',
          eventType: 'auth_failed',
          severity: 'high',
          details: {
            reason: 'Rate limit exceeded',
            limit: rateLimitResult.limit,
            resetIn: rateLimitResult.resetIn,
          },
        });

        return NextResponse.json(
          {
            error: 'Rate limit exceeded. Too many requests.',
            resetIn: rateLimitResult.resetIn,
          },
          {
            status: 429,
            headers: createRateLimitHeaders(rateLimitResult),
          }
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
          fundType: 'strike',
          strikeStartDate: new Date(strikeStartDate).toISOString(),
          targetAmount: targetFundAmount,
          weeklyStipendAmount,
          minimumAttendanceHours: minimumPicketHours,
          strikeStatus: 'planned',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .returning();

      // Log financial transaction
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId: context.userId,
        endpoint: '/api/strike/funds',
        method: 'POST',
        eventType: 'success',
        severity: 'high',
        details: {
          fundId: newFund.id,
          organizationId,
          fundName,
          fundCode,
          targetAmount: targetFundAmount,
          weeklyStipendAmount,
          strikeStartDate,
          strikeStatus: 'planned',
          dataType: 'FINANCIAL',
          transactionType: 'STRIKE_FUND_CREATED',
        },
      });

      return NextResponse.json(
        {
          success: true,
          data: newFund,
          message: 'Strike fund created successfully',
        },
        { status: 201 }
      );
  } catch (error) {
    logApiAuditEvent({
      timestamp: new Date().toISOString(),
      userId: context.userId,
      endpoint: '/api/strike/funds',
      method: 'POST',
      eventType: 'auth_failed',
      severity: 'high',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    logger.error('Failed to create strike fund', error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

