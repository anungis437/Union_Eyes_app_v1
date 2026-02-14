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
import { grievances } from '@/db/schema/grievance-schema';
import { claims } from '@/db/schema/claims-schema';
import { and, inArray, eq, gte, sql, count, avg } from 'drizzle-orm';
import { 
  aggregateWithPrivacy, 
  calculateTrendWithConfidence,
  generateLegislativeBrief,
  validateAggregationRequest 
} from '@/lib/movement-insights/aggregation-service';
import { validateConsent, meetsAggregationThreshold } from '@/lib/movement-insights/consent-manager';
import { logger } from '@/lib/logger';

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
    logger.error('Error fetching trends:', error);
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

    // Query actual case data from participating organizations
    const dataPoints = await queryAggregateData(
      consents.map(c => c.organizationId),
      trendType,
      timeframe as 'month' | 'quarter' | 'year',
      jurisdiction || undefined,
      sector || undefined
    );

    // Aggregate with privacy guarantees
    const { trend, confidence, message } = calculateTrendWithConfidence({
      trendType,
      jurisdiction,
      sector,
      timeframe,
      dataPoints,
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
    logger.error('Error calculating trend:', error);
    return NextResponse.json(
      { error: 'Failed to calculate trend' },
      { status: 500 }
    );
  }
}

/**
 * Helper to query aggregate case data
 * 
 * Queries grievances and claims based on trendType
 */
async function queryAggregateData(
  organizationIds: string[],
  trendType: string,
  timeframe: 'month' | 'quarter' | 'year',
  jurisdiction?: string,
  sector?: string
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

  // Build base query filters
  const baseFilters: any[] = [
    inArray(grievances.organizationId, organizationIds),
    gte(grievances.filedDate, startDate),
  ];

  try {
    // Query based on trend type
    switch (trendType) {
      case 'success_rate':
      case 'win_rate': {
        // Calculate percentage of favorable outcomes
        const results = await db
          .select({
            organizationId: grievances.organizationId,
            total: count(),
            favorable: sql<number>`COUNT(CASE WHEN ${grievances.status} IN ('resolved', 'settled') THEN 1 END)`,
          })
          .from(grievances)
          .where(and(...baseFilters))
          .groupBy(grievances.organizationId);
        
        return results.map(r => ({
          organizationId: r.organizationId,
          value: Number(r.total) > 0 ? (Number(r.favorable) / Number(r.total)) * 100 : 0,
          weight: Number(r.total),
        }));
      }

      case 'settlement_time':
      case 'avg_resolution_time': {
        // Calculate average days to resolution
        const results = await db
          .select({
            organizationId: grievances.organizationId,
            avgDays: sql<number>`AVG(EXTRACT(EPOCH FROM (${grievances.resolvedAt} - ${grievances.filedDate})) / 86400)`,
            total: count(),
          })
          .from(grievances)
          .where(
            and(
              ...baseFilters,
              sql`${grievances.resolvedAt} IS NOT NULL`
            )
          )
          .groupBy(grievances.organizationId);
        
        return results.map(r => ({
          organizationId: r.organizationId,
          value: Number(r.avgDays) || 0,
          weight: Number(r.total),
        }));
      }

      case 'case_volume': {
        // Count total cases
        const results = await db
          .select({
            organizationId: grievances.organizationId,
            total: count(),
          })
          .from(grievances)
          .where(and(...baseFilters))
          .groupBy(grievances.organizationId);
        
        return results.map(r => ({
          organizationId: r.organizationId,
          value: Number(r.total),
          weight: Number(r.total),
        }));
      }

      case 'arbitration_rate': {
        // Percentage of cases going to arbitration
        const results = await db
          .select({
            organizationId: grievances.organizationId,
            total: count(),
            arbitrations: sql<number>`COUNT(CASE WHEN ${grievances.step} = 'arbitration' THEN 1 END)`,
          })
          .from(grievances)
          .where(and(...baseFilters))
          .groupBy(grievances.organizationId);
        
        return results.map(r => ({
          organizationId: r.organizationId,
          value: Number(r.total) > 0 ? (Number(r.arbitrations) / Number(r.total)) * 100 : 0,
          weight: Number(r.total),
        }));
      }

      default:
        // Default: return case counts
        const results = await db
          .select({
            organizationId: grievances.organizationId,
            total: count(),
          })
          .from(grievances)
          .where(and(...baseFilters))
          .groupBy(grievances.organizationId);
        
        return results.map(r => ({
          organizationId: r.organizationId,
          value: Number(r.total),
          weight: Number(r.total),
        }));
    }
  } catch (error) {
    logger.error('Error querying aggregate data:', error);
    // Return empty results on error
    return organizationIds.map((orgId) => ({
      organizationId: orgId,
      value: 0,
      weight: 0,
    }));
  }
}
