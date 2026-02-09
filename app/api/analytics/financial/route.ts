/**
 * Financial Analytics API
 * 
 * GET /api/analytics/financial
 * Returns financial metrics, claim values, settlements, and costs
 */

import { NextRequest, NextResponse } from 'next/server';
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { db } from '@/db/db';
import { claims } from '@/db/schema/claims-schema';
import { sql, gte, and, eq } from 'drizzle-orm';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';
import { logApiAuditEvent } from '@/lib/middleware/request-validation';

export const GET = withRoleAuth('steward', async (req: NextRequest, context) => {
  const { userId, organizationId } = context;

  // Rate limit financial analytics (sensitive data)
  const rateLimitResult = await checkRateLimit(
    RATE_LIMITS.ANALYTICS_QUERY,
    `analytics-financial:${userId}`
  );

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded', resetIn: rateLimitResult.resetIn },
      { status: 429 }
    );
  }

  try {
    const tenantId = organizationId;
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Organization ID required' },
        { status: 400 }
      );
    }

    const url = new URL(req.url);
    const days = parseInt(url.searchParams.get('days') || '90');
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Calculate previous period dates for comparison
    const prevStartDate = new Date(startDate);
    prevStartDate.setDate(prevStartDate.getDate() - days);

    // Get current period financial summary
    const currentPeriod = await db.select({
      totalClaims: sql<number>`count(distinct ${claims.claimId})`,
      totalClaimValue: sql<number>`coalesce(sum(${claims.claimAmount}), 0)`,
      totalSettlements: sql<number>`coalesce(sum(case when ${claims.resolutionOutcome} = 'won' then ${claims.settlementAmount} else 0 end), 0)`,
      totalCosts: sql<number>`coalesce(sum(${claims.legalCosts} + coalesce(${claims.courtCosts}, 0)), 0)`,
      avgClaimValue: sql<number>`coalesce(avg(${claims.claimAmount}), 0)`,
    })
    .from(claims)
    .where(and(
      eq(claims.organizationId, tenantId),
      gte(claims.filedDate, startDate)
    ));

    // Get previous period financial summary
    const previousPeriod = await db.select({
      totalClaimValue: sql<number>`coalesce(sum(${claims.claimAmount}), 0)`,
      totalSettlements: sql<number>`coalesce(sum(case when ${claims.resolutionOutcome} = 'won' then ${claims.settlementAmount} else 0 end), 0)`,
      totalCosts: sql<number>`coalesce(sum(${claims.legalCosts} + coalesce(${claims.courtCosts}, 0)), 0)`,
    })
    .from(claims)
    .where(and(
      eq(claims.organizationId, tenantId),
      gte(claims.filedDate, prevStartDate),
      sql`${claims.filedDate} < ${startDate}`
    ));

    const current = currentPeriod[0];
    const previous = previousPeriod[0];

    // Calculate derived metrics
    const totalClaimValue = Number(current.totalClaimValue) || 0;
    const totalSettlements = Number(current.totalSettlements) || 0;
    const totalCosts = Number(current.totalCosts) || 0;
    const avgClaimValue = Number(current.avgClaimValue) || 0;
    const totalClaims = Number(current.totalClaims) || 1;

    const recoveryRate = totalClaimValue > 0 ? (totalSettlements / totalClaimValue) * 100 : 0;
    const costPerClaim = totalClaims > 0 ? totalCosts / totalClaims : 0;
    const roi = totalCosts > 0 ? ((totalSettlements - totalCosts) / totalCosts) * 100 : 0;

    // Previous period metrics
    const prevTotalClaimValue = Number(previous.totalClaimValue) || 0;
    const prevTotalSettlements = Number(previous.totalSettlements) || 0;
    const prevTotalCosts = Number(previous.totalCosts) || 0;
    const prevRecoveryRate = prevTotalClaimValue > 0 ? (prevTotalSettlements / prevTotalClaimValue) * 100 : 0;
    const prevRoi = prevTotalCosts > 0 ? ((prevTotalSettlements - prevTotalCosts) / prevTotalCosts) * 100 : 0;

    return NextResponse.json({
      totalClaimValue,
      totalSettlements,
      totalCosts,
      avgClaimValue,
      recoveryRate,
      costPerClaim,
      roi,
      previousPeriod: {
        totalClaimValue: prevTotalClaimValue,
        totalSettlements: prevTotalSettlements,
        totalCosts: prevTotalCosts,
        recoveryRate: prevRecoveryRate,
        roi: prevRoi
      }
    });
  } catch (error) {
    console.error('Financial analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch financial analytics' },
      { status: 500 }
    );
  }
});
