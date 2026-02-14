/**
 * Organizer Impact API Endpoint
 * 
 * GET /api/organizer/impact - Fetch impact metrics for authenticated organizer
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { organizerImpacts, OrganizerImpact } from '@/db/schema/domains/marketing';
import { and } from 'drizzle-orm';
import { calculateOrganizerImpact, ImpactCalculationInput, generateRecognitionEvents } from '@/lib/marketing/organizer-impact';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // In production, get authenticated user ID from session
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month'; // month, quarter, year
    const userId = searchParams.get('userId'); // For testing; use session in production

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      );
    }

    // Calculate date ranges
    const now = new Date();
    const currentPeriodStart = getPeriodStart(now, period);
    const previousPeriodStart = getPeriodStart(currentPeriodStart, period);
    const previousPeriodEnd = new Date(currentPeriodStart.getTime() - 1);

    // Fetch or calculate current period impact
    let currentImpact: OrganizerImpact | null = await fetchImpactFromDB(
      userId,
      currentPeriodStart,
      now
    );

    if (!currentImpact) {
      // Calculate from case data
      currentImpact = await calculateFromCaseData(
        userId,
        currentPeriodStart,
        now
      );

      // Store in database
      if (currentImpact) {
        await db.insert(organizerImpacts).values(currentImpact);
      }
    }

    // Fetch or calculate previous period impact
    const previousImpact = await fetchImpactFromDB(
      userId,
      previousPeriodStart,
      previousPeriodEnd
    );

    return NextResponse.json({
      current: currentImpact,
      previous: previousImpact,
    });
  } catch (error) {
    logger.error('Failed to fetch organizer impact:', error);
    return NextResponse.json(
      { error: 'Failed to fetch impact data' },
      { status: 500 }
    );
  }
}

/**
 * Get the start date for a period
 */
function getPeriodStart(date: Date, period: 'month' | 'quarter' | 'year'): Date {
  const d = new Date(date);
  
  if (period === 'month') {
    d.setMonth(d.getMonth() - 1);
  } else if (period === 'quarter') {
    d.setMonth(d.getMonth() - 3);
  } else if (period === 'year') {
    d.setFullYear(d.getFullYear() - 1);
  }
  
  return d;
}

/**
 * Fetch impact from database
 */
async function fetchImpactFromDB(
  userId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<OrganizerImpact | null> {
  const [impact] = await db
    .select()
    .from(organizerImpacts)
    .where(
      and(
        eq(organizerImpacts.userId, userId),
        gte(organizerImpacts.periodStart, periodStart),
        lte(organizerImpacts.periodEnd, periodEnd)
      )
    )
    .limit(1);

  return impact || null;
}

/**
 * Calculate impact from case data
 * In production, this would query the grievances table
 */
async function calculateFromCaseData(
  userId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<OrganizerImpact | null> {
  try {
    // Query grievances assigned to this organizer within the period
    // const cases = await db.select().from(grievances).where(...)
    
    // For now, return null (implement when grievances schema is integrated)
    return null;

    // Example implementation:
    // const input: ImpactCalculationInput = {
    //   organizerId: userId,
    //   organizationId: 'org-id',
    //   periodStart,
    //   periodEnd,
    //   casesData: cases.map(c => ({
    //     id: c.id,
    //     status: c.status,
    //     createdAt: c.createdAt,
    //     resolvedAt: c.resolvedAt,
    //     memberSatisfaction: c.memberSatisfaction,
    //     escalated: c.escalated,
    //     democraticActions: c.democraticActions,
    //   })),
    // };
    //
    // const impact = calculateOrganizerImpact(input);
    //
    // // Generate recognition events
    // const previousImpact = await fetchImpactFromDB(
    //   userId,
    //   getPeriodStart(periodStart, 'month'),
    //   new Date(periodStart.getTime() - 1)
    // );
    //
    // const recognitionEvents = generateRecognitionEvents(impact, previousImpact);
    // impact.recognitionEvents.push(...recognitionEvents);
    //
    // return impact;
  } catch (error) {
    logger.error('Failed to calculate impact from case data:', error);
    return null;
  }
}

/**
 * POST /api/organizer/impact/recalculate - Manually trigger recalculation
 * (Admin/system use only)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, periodStart, periodEnd } = body;

    if (!userId || !periodStart || !periodEnd) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const impact = await calculateFromCaseData(
      userId,
      new Date(periodStart),
      new Date(periodEnd)
    );

    if (impact) {
      // Upsert into database
      await db.insert(organizerImpacts).values(impact)
        .onConflictDoUpdate({
          target: [organizerImpacts.userId, organizerImpacts.periodStart],
          set: impact,
        });

      return NextResponse.json({ impact });
    }

    return NextResponse.json(
      { error: 'No case data found for period' },
      { status: 404 }
    );
  } catch (error) {
    logger.error('Failed to recalculate impact:', error);
    return NextResponse.json(
      { error: 'Failed to recalculate impact' },
      { status: 500 }
    );
  }
}
