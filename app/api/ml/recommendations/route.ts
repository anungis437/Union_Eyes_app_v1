import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/db';
import { claims, users, deadlines } from '@/db/schema';
import { eq, and, isNull, lte, gte, sql, desc, ne, or } from 'drizzle-orm';
import { requireUser } from '@/lib/auth/unified-auth';

/**
 * GET /api/ml/recommendations?type=steward|deadline|strategy|priority
 * Smart recommendations engine
 * 
 * Query params:
 * - type: steward | deadline | strategy | priority | all
 * - claimId: (optional) specific claim for recommendations
 * 
 * Response:
 * {
 *   recommendations: Array<{
 *     type: string,
 *     title: string,
 *     description: string,
 *     confidence: number,
 *     priority: 'low' | 'medium' | 'high',
 *     action?: {
 *       label: string,
 *       url: string
 *     }
 *   }>
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const { userId, organizationId } = await requireUser();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = organizationId || userId;
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'all';
    const claimId = searchParams.get('claimId');

    const recommendations: any[] = [];

    // Steward assignment recommendations
    if (type === 'steward' || type === 'all') {
      const stewardRecs = await generateStewardRecommendations(tenantId, claimId);
      recommendations.push(...stewardRecs);
    }

    // Deadline recommendations
    if (type === 'deadline' || type === 'all') {
      const deadlineRecs = await generateDeadlineRecommendations(tenantId, claimId);
      recommendations.push(...deadlineRecs);
    }

    // Strategy recommendations
    if (type === 'strategy' || type === 'all') {
      const strategyRecs = await generateStrategyRecommendations(tenantId, claimId);
      recommendations.push(...strategyRecs);
    }

    // Priority recommendations
    if (type === 'priority' || type === 'all') {
      const priorityRecs = await generatePriorityRecommendations(tenantId);
      recommendations.push(...priorityRecs);
    }

    // Sort by priority and confidence
    recommendations.sort((a, b) => {
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      const aScore = priorityWeight[(a.priority as 'high' | 'medium' | 'low')] * a.confidence;
      const bScore = priorityWeight[(b.priority as 'high' | 'medium' | 'low')] * b.confidence;
      return bScore - aScore;
    });

    return NextResponse.json({ recommendations });
    
  } catch (error) {
    console.error('Recommendations error:', error);
    return NextResponse.json(
      { error: 'Failed to generate recommendations' },
      { status: 500 }
    );
  }
}

/**
 * Generate steward assignment recommendations
 */
async function generateStewardRecommendations(
  tenantId: string,
  claimId?: string | null
): Promise<any[]> {
  const recommendations: any[] = [];

  try {
    // Find unassigned claims
    const unassignedClaims = await db.query.claims.findMany({
      where: and(
        eq(claims.organizationId, tenantId),
        isNull(claims.assignedTo),
        ne(claims.status, 'closed')
      )
    });

    if (unassignedClaims.length > 0) {
      // Get steward workload
      const stewardWorkload = await db
        .select({
          stewardId: claims.assignedTo,
          count: sql<number>`count(*)::int`,
        })
        .from(claims)
        .where(
          and(
            eq(claims.organizationId, tenantId),
            ne(claims.status, 'closed')
          )
        )
        .groupBy(claims.assignedTo);

      const avgWorkload = stewardWorkload.length > 0
        ? stewardWorkload.reduce((sum, s) => sum + s.count, 0) / stewardWorkload.length
        : 0;

      recommendations.push({
        type: 'steward',
        title: `${unassignedClaims.length} Unassigned Claims Need Stewards`,
        description: `Assign claims to balance workload. Current average: ${Math.round(avgWorkload)} claims per steward.`,
        confidence: 0.9,
        priority: unassignedClaims.length > 5 ? 'high' : 'medium',
        action: {
          label: 'View Unassigned Claims',
          url: '/claims?status=open&assigned=false'
        },
        metadata: {
          count: unassignedClaims.length,
          avgWorkload
        }
      });
    }

    // Check for overloaded stewards
    const overloadedThreshold = 10;
    const overloadedStewards = await db
      .select({
        stewardId: claims.assignedTo,
        stewardName: users.displayName,
        count: sql<number>`count(*)::int`,
      })
      .from(claims)
      .innerJoin(users, eq(claims.assignedTo, users.userId))
      .where(
        and(
          eq(claims.organizationId, tenantId),
          ne(claims.status, 'closed')
        )
      )
      .groupBy(claims.assignedTo, users.displayName)
      .having(sql`count(*) > ${overloadedThreshold}`);

    if (overloadedStewards.length > 0) {
      recommendations.push({
        type: 'steward',
        title: `${overloadedStewards.length} Stewards Are Overloaded`,
        description: `${overloadedStewards.map(s => `${s.stewardName} (${s.count} claims)`).join(', ')} need workload rebalancing.`,
        confidence: 0.85,
        priority: 'high',
        action: {
          label: 'Rebalance Workload',
          url: '/admin/stewards?view=workload'
        },
        metadata: {
          overloadedStewards
        }
      });
    }

  } catch (error) {
    console.error('Steward recommendations error:', error);
  }

  return recommendations;
}

/**
 * Generate deadline recommendations
 */
async function generateDeadlineRecommendations(
  tenantId: string,
  claimId?: string | null
): Promise<any[]> {
  const recommendations: any[] = [];

  try {
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    // Find upcoming deadlines
    const upcomingDeadlines = await db.query.deadlines.findMany({
      where: and(
        eq(deadlines.tenantId, tenantId),
        lte(deadlines.dueDate, threeDaysFromNow),
        gte(deadlines.dueDate, now),
        isNull(deadlines.completedAt)
      )
    });

    if (upcomingDeadlines.length > 0) {
      recommendations.push({
        type: 'deadline',
        title: `${upcomingDeadlines.length} Deadlines Due Within 3 Days`,
        description: 'Immediate attention required to maintain SLA compliance.',
        confidence: 1.0,
        priority: 'high',
        action: {
          label: 'View Upcoming Deadlines',
          url: '/deadlines?filter=upcoming'
        },
        metadata: {
          deadlines: upcomingDeadlines.slice(0, 5).map(d => ({
            id: d.id,
            claimId: d.claimId,
            type: d.deadlineType,
            dueDate: d.dueDate
          }))
        }
      });
    }

    // Find overdue deadlines
    const overdueDeadlines = await db.query.deadlines.findMany({
      where: and(
        eq(deadlines.tenantId, tenantId),
        lte(deadlines.dueDate, now),
        isNull(deadlines.completedAt)
      )
    });

    if (overdueDeadlines.length > 0) {
      recommendations.push({
        type: 'deadline',
        title: `${overdueDeadlines.length} Overdue Deadlines Need Action`,
        description: 'Critical: These deadlines have passed. SLA at risk.',
        confidence: 1.0,
        priority: 'high',
        action: {
          label: 'Address Overdue Items',
          url: '/deadlines?filter=overdue'
        },
        metadata: {
          count: overdueDeadlines.length
        }
      });
    }

  } catch (error) {
    console.error('Deadline recommendations error:', error);
  }

  return recommendations;
}

/**
 * Generate strategy recommendations
 */
async function generateStrategyRecommendations(
  tenantId: string,
  claimId?: string | null
): Promise<any[]> {
  const recommendations: any[] = [];

  try {
    // Analyze claim patterns
    const claimsByType = await db
      .select({
        type: claims.claimType,
        count: sql<number>`count(*)::int`,
        wonCount: sql<number>`count(*) filter (where status = 'won')::int`,
      })
      .from(claims)
      .where(eq(claims.organizationId, tenantId))
      .groupBy(claims.claimType);

    // Find claim types with low win rates
    const lowWinRateTypes = claimsByType.filter(t => {
      const winRate = t.count > 0 ? t.wonCount / t.count : 0;
      return t.count >= 5 && winRate < 0.5;
    });

    if (lowWinRateTypes.length > 0) {
      recommendations.push({
        type: 'strategy',
        title: 'Review Strategy for Low-Performing Claim Types',
        description: `${lowWinRateTypes.map(t => t.type).join(', ')} have low win rates. Consider training or strategy adjustment.`,
        confidence: 0.75,
        priority: 'medium',
        action: {
          label: 'View Analytics',
          url: '/analytics/claims'
        },
        metadata: {
          lowWinRateTypes: lowWinRateTypes.map(t => ({
            type: t.type,
            count: t.count,
            winRate: t.count > 0 ? (t.wonCount / t.count).toFixed(2) : '0.00'
          }))
        }
      });
    }

  } catch (error) {
    console.error('Strategy recommendations error:', error);
  }

  return recommendations;
}

/**
 * Generate priority recommendations
 */
async function generatePriorityRecommendations(
  tenantId: string
): Promise<any[]> {
  const recommendations: any[] = [];

  try {
    // Find old open claims
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const oldOpenClaims = await db.query.claims.findMany({
      where: and(
        eq(claims.organizationId, tenantId),
        ne(claims.status, 'closed'),
        lte(claims.createdAt, thirtyDaysAgo)
      ),
      orderBy: [claims.createdAt],
      limit: 5
    });

    if (oldOpenClaims.length > 0) {
      recommendations.push({
        type: 'priority',
        title: `${oldOpenClaims.length} Claims Open for 30+ Days`,
        description: 'Long-running claims may need escalation or additional resources.',
        confidence: 0.8,
        priority: 'medium',
        action: {
          label: 'Review Old Claims',
          url: '/claims?status=open&age=30+'
        },
        metadata: {
          oldestClaim: {
            id: oldOpenClaims[0].claimId,
            age: Math.floor((Date.now() - new Date(oldOpenClaims[0].createdAt || new Date()).getTime()) / (1000 * 60 * 60 * 24))
          }
        }
      });
    }

  } catch (error) {
    console.error('Priority recommendations error:', error);
  }

  return recommendations;
}
