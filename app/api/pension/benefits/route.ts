/**
 * API Route: Pension Benefits Calculation
 * Calculate pension benefits using database functions
 * Phase 1: Pension & Health/Welfare
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db/db';
import { sql } from 'drizzle-orm';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * POST /api/pension/benefits/calculate
 * Calculate pension benefit for a member
 * Uses the calculate_pension_benefit database function
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
    const { pensionPlanId, memberId, calculationDate } = body;

    if (!pensionPlanId || !memberId) {
      return NextResponse.json(
        { error: 'Bad Request - pensionPlanId and memberId are required' },
        { status: 400 }
      );
    }

    const date = calculationDate || new Date().toISOString().split('T')[0];

    // Call database function
    const result = await db.execute(
      sql`SELECT * FROM calculate_pension_benefit(${pensionPlanId}::uuid, ${memberId}::uuid, ${date}::date)`
    );

    const benefitAmount = result[0]?.benefit_amount;

    return NextResponse.json({
      success: true,
      data: {
        pensionPlanId,
        memberId,
        calculationDate: date,
        benefitAmount: benefitAmount ? parseFloat(benefitAmount as string) : 0,
      },
    });

  } catch (error) {
    logger.error('Failed to calculate pension benefit', error as Error, {      correlationId: request.headers.get('x-correlation-id'),
    });
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
