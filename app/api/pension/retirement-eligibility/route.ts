/**
 * API Route: Retirement Eligibility
 * Check retirement eligibility for members
 * Phase 1: Pension & Health/Welfare
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db/db';
import { sql } from 'drizzle-orm';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * POST /api/pension/retirement-eligibility
 * Check retirement eligibility for a member
 * Uses the calculate_retirement_eligibility database function
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
    const { pensionPlanId, memberId, checkDate } = body;

    if (!pensionPlanId || !memberId) {
      return NextResponse.json(
        { error: 'Bad Request - pensionPlanId and memberId are required' },
        { status: 400 }
      );
    }

    const date = checkDate || new Date().toISOString().split('T')[0];

    // Call database function
    const result = await db.execute(
      sql`SELECT * FROM calculate_pension_eligibility(${pensionPlanId}::uuid, ${memberId}::uuid, ${date}::date)`
    );

    const eligibility = result[0];

    return NextResponse.json({
      success: true,
      data: {
        pensionPlanId,
        memberId,
        checkDate: date,
        isEligible: eligibility?.is_eligible || false,
        eligibilityType: eligibility?.eligibility_type || null,
        reason: eligibility?.reason || null,
        minimumHoursMet: eligibility?.minimum_hours_met || false,
        ageRequirementMet: eligibility?.age_requirement_met || false,
        vestingPeriodMet: eligibility?.vesting_period_met || false,
      },
    });

  } catch (error) {
    logger.error('Failed to check retirement eligibility', error as Error, {      correlationId: request.headers.get('x-correlation-id'),
    });
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
