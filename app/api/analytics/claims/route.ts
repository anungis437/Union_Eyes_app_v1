/**
 * Claims Analytics API
 * 
 * GET /api/analytics/claims
 * Returns comprehensive claims metrics, trends, and breakdowns with period comparison
 */

import { NextRequest, NextResponse } from 'next/server';
import { withTenantAuth } from '@/lib/tenant-middleware';
import { sql } from '@/lib/db';

async function handler(req: NextRequest) {
  try {
    const tenantId = req.headers.get('x-tenant-id');
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID required' },
        { status: 400 }
      );
    }

    const url = new URL(req.url);
    const daysBack = parseInt(url.searchParams.get('days') || '30');
    const includeDetails = url.searchParams.get('details') === 'true';
    
    // Parse optional filters
    const filters: any = {};
    if (url.searchParams.get('status')) {
      filters.status = url.searchParams.get('status')!.split(',');
    }
    if (url.searchParams.get('claimType')) {
      filters.claimType = url.searchParams.get('claimType')!.split(',');
    }
    if (url.searchParams.get('priority')) {
      filters.priority = url.searchParams.get('priority')!.split(',');
    }
    if (url.searchParams.get('assignedTo')) {
      filters.assignedTo = url.searchParams.get('assignedTo')!;
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    // Get claims analytics
    const analytics = await getClaimsAnalytics(tenantId, { startDate, endDate });

    // Optionally include detailed claims list
    let details = null;
    if (includeDetails) {
      details = await getClaimsByDateRange(tenantId, { startDate, endDate }, filters);
    }

    return NextResponse.json({
      analytics,
      details,
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        daysBack,
      },
      filters: Object.keys(filters).length > 0 ? filters : null,
    });
  } catch (error) {
    console.error('Claims analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch claims analytics' },
      { status: 500 }
    );
  }
}

export const GET = withTenantAuth(handler);
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
