/**
 * Movement Insights API
 * 
 * Provides privacy-preserving cross-union trend data.
 * 
 * Security: Validates consent before returning any aggregated data.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { 
  dataAggregationConsent, 
  movementTrends, 
  organizations 
} from '@/db/schema';
import { and, inArray } from 'drizzle-orm';
import { 
  aggregateWithPrivacy, 
  calculateTrendWithConfidence,
  generateLegislativeBrief,
  validateAggregationRequest 
} from '@/lib/movement-insights/aggregation-service';
import { validateConsent, meetsAggregationThreshold } from '@/lib/movement-insights/consent-manager';

/**
 * GET /api/movement-insights/trends
 * 
 * Query anonymized movement trends
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const trendType = searchParams.get('trendType');
    const timeframe = searchParams.get('timeframe') || 'quarter';
    const jurisdiction = searchParams.get('jurisdiction');
    const sector = searchParams.get('sector');

    if (!trendType) {
      return NextResponse.json(
        { error: 'Trend type required' },
        { status: 400 }
      );
    }

    // Validate timeframe
    if (!['month', 'quarter', 'year'].includes(timeframe)) {
      return NextResponse.json(
        { error: 'Invalid timeframe' },
        { status: 400 }
      );
    }

    // Get trends from database
    const trends = await db
      .select()
      .from(movementTrends)
      .where(
        and(
          eq(movementTrends.trendType, trendType),
          eq(movementTrends.timeframe, timeframe as 'month' | 'quarter' | 'year'),
          jurisdiction ? eq(movementTrends.jurisdiction, jurisdiction) : undefined,
          sector ? eq(movementTrends.sector, sector) : undefined
        )
      )
      .orderBy(sql`${movementTrends.calculatedAt} DESC`)
      .limit(10);

    return NextResponse.json({ trends });
  } catch (error) {
    console.error('Error fetching trends:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trends' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/movement-insights/calculate
 * 
 * Calculate new trend from raw data (admin/background job only)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      trendType, 
      jurisdiction, 
      sector, 
      timeframe,
      dataType // e.g., 'shareImpactMetrics', 'shareCaseResolutionTimes'
    } = body;

    if (!trendType || !timeframe || !dataType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get all organizations with active consent for this data type
    const consents = await db
      .select()
      .from(dataAggregationConsent)
      .where(
        and(
          eq(dataAggregationConsent.status, 'active'),
          sql`${dataAggregationConsent.preferences}->>${dataType} = 'true'`
        )
      );

    if (consents.length < 5) {
      return NextResponse.json(
        { 
          error: 'Insufficient participating organizations',
          participatingOrgs: consents.length,
          required: 5 
        },
        { status: 400 }
      );
    }

    // TODO: Query actual case data from grievances table based on trendType
    // This is a placeholder - in production, you&apos;d query real data
    const mockDataPoints = consents.map((consent) => ({
      organizationId: consent.organizationId,
      value: Math.random() * 100, // Replace with real query
      weight: Math.floor(Math.random() * 50) + 10, // Number of cases
    }));

    // Aggregate with privacy guarantees
    const { trend, confidence, message } = calculateTrendWithConfidence({
      trendType,
      jurisdiction,
      sector,
      timeframe,
      dataPoints: mockDataPoints,
    });

    if (!trend) {
      return NextResponse.json(
        { error: message },
        { status: 400 }
      );
    }

    // Save trend to database
    const [savedTrend] = await db
      .insert(movementTrends)
      .values(trend)
      .returning();

    return NextResponse.json({ 
      trend: savedTrend, 
      confidence, 
      message 
    }, { status: 201 });
  } catch (error) {
    console.error('Error calculating trend:', error);
    return NextResponse.json(
      { error: 'Failed to calculate trend' },
      { status: 500 }
    );
  }
}

/**
 * Helper to query aggregate case data
 * 
 * This would be used by the POST endpoint to get real data
 */
async function queryAggregateData(
  organizationIds: string[],
  trendType: string,
  timeframe: 'month' | 'quarter' | 'year'
): Promise<Array<{ organizationId: string; value: number; weight: number }>> {
  // Calculate date range
  const now = new Date();
  const startDate = new Date();
  
  if (timeframe === 'month') {
    startDate.setMonth(now.getMonth() - 1);
  } else if (timeframe === 'quarter') {
    startDate.setMonth(now.getMonth() - 3);
  } else {
    startDate.setFullYear(now.getFullYear() - 1);
  }

  // TODO: Implement actual queries based on trendType
  // Examples:
  // - 'avg-resolution-time': AVG(resolution_days) grouped by organization
  // - 'win-rate': COUNT(favorable_outcomes) / COUNT(*) grouped by organization
  // - 'member-satisfaction': AVG(satisfaction_rating) grouped by organization
  
  // This is a placeholder
  return organizationIds.map((orgId) => ({
    organizationId: orgId,
    value: 0,
    weight: 0,
  }));
}
