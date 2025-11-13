import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db/db';
import { claims } from '@/db/schema/claims-schema';
import { eq, desc, and, count, sql, gte } from 'drizzle-orm';

/**
 * GET /api/analytics/claims
 * Get detailed claims analytics
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '30'; // days
    const groupBy = searchParams.get('groupBy') || 'day'; // day, week, month
    const claimType = searchParams.get('claimType'); // Optional filter

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(timeRange));

    // Build where conditions
    const whereConditions = [
      gte(claims.createdAt, startDate)
    ];

    if (claimType) {
      whereConditions.push(eq(claims.claimType, claimType as any));
    }

    // Get claims by type over time
    let dateGrouping;
    switch (groupBy) {
      case 'week':
        dateGrouping = sql`DATE_TRUNC('week', created_at)`;
        break;
      case 'month':
        dateGrouping = sql`DATE_TRUNC('month', created_at)`;
        break;
      default: // day
        dateGrouping = sql`DATE(created_at)`;
    }

    const claimsOverTime = await db
      .select({
        period: dateGrouping,
        claimType: claims.claimType,
        count: count(),
      })
      .from(claims)
      .where(and(...whereConditions))
      .groupBy(dateGrouping, claims.claimType)
      .orderBy(dateGrouping);

    // Get status transitions (claims that changed status)
    const statusTransitions = await db
      .select({
        fromStatus: sql<string>`LAG(status) OVER (PARTITION BY claim_id ORDER BY updated_at)`,
        toStatus: claims.status,
        count: count(),
      })
      .from(claims)
      .where(and(...whereConditions))
      .groupBy(sql`LAG(status) OVER (PARTITION BY claim_id ORDER BY updated_at)`, claims.status);

    // Get priority distribution by type
    const priorityByType = await db
      .select({
        claimType: claims.claimType,
        priority: claims.priority,
        count: count(),
      })
      .from(claims)
      .where(and(...whereConditions))
      .groupBy(claims.claimType, claims.priority);

    // Get AI score statistics
    const [aiScoreStats] = await db
      .select({
        avgMeritScore: sql<number>`AVG(ai_score)`,
        avgConfidence: sql<number>`AVG(merit_confidence)`,
        avgPrecedentMatch: sql<number>`AVG(precedent_match)`,
        avgComplexity: sql<number>`AVG(complexity_score)`,
      })
      .from(claims)
      .where(and(...whereConditions));

    // Get top claim types
    const topClaimTypes = await db
      .select({
        claimType: claims.claimType,
        count: count(),
        avgAiScore: sql<number>`AVG(ai_score)`,
        resolved: sql<number>`COUNT(CASE WHEN status = 'resolved' THEN 1 END)`,
        rejected: sql<number>`COUNT(CASE WHEN status = 'rejected' THEN 1 END)`,
      })
      .from(claims)
      .where(and(...whereConditions))
      .groupBy(claims.claimType)
      .orderBy(desc(count()))
      .limit(10);

    return NextResponse.json({
      timeRange: parseInt(timeRange),
      groupBy,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      filters: {
        claimType: claimType || null,
      },
      trends: {
        claimsOverTime,
        statusTransitions: statusTransitions.filter(s => s.fromStatus !== null),
      },
      distribution: {
        priorityByType,
      },
      aiAnalytics: {
        avgMeritScore: aiScoreStats.avgMeritScore 
          ? Math.round(aiScoreStats.avgMeritScore * 10) / 10 
          : null,
        avgConfidence: aiScoreStats.avgConfidence 
          ? Math.round(aiScoreStats.avgConfidence * 10) / 10 
          : null,
        avgPrecedentMatch: aiScoreStats.avgPrecedentMatch 
          ? Math.round(aiScoreStats.avgPrecedentMatch * 10) / 10 
          : null,
        avgComplexity: aiScoreStats.avgComplexity 
          ? Math.round(aiScoreStats.avgComplexity * 10) / 10 
          : null,
      },
      topClaimTypes,
    });
  } catch (error) {
    console.error('Error fetching claims analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
