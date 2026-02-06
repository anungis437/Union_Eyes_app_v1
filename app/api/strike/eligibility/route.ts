/**
 * API Route: Strike Eligibility Check
 * Check member eligibility for strike benefits
 * Phase 4: Strike Fund Management
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db/db';
import { sql } from 'drizzle-orm';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * POST /api/strike/eligibility
 * Check if a member is eligible for strike benefits
 * Uses the calculate_strike_eligibility database function
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
    const { strikeFundId, memberId, checkDate } = body;

    if (!strikeFundId || !memberId) {
      return NextResponse.json(
        { error: 'Bad Request - strikeFundId and memberId are required' },
        { status: 400 }
      );
    }

    const date = checkDate || new Date().toISOString().split('T')[0];

    // Call database function
    const result = await db.execute(
      sql`SELECT * FROM calculate_strike_eligibility(${strikeFundId}::uuid, ${memberId}::uuid, ${date}::date)`
    );

    const eligibility = result[0];

    return NextResponse.json({
      success: true,
      data: {
        strikeFundId,
        memberId,
        checkDate: date,
        isEligible: eligibility?.is_eligible || false,
        eligibilityReason: eligibility?.eligibility_reason || '',
        membershipDurationMet: eligibility?.membership_duration_met || false,
        duesCurrentStatus: eligibility?.dues_current_status || false,
        requiredMembershipMonths: eligibility?.required_membership_months || 0,
      },
    });

  } catch (error) {
    const body = await request.json();
    logger.error('Failed to check strike eligibility', error as Error, {
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
