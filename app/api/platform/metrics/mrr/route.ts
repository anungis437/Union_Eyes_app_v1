/**
 * Platform MRR/ARR Metrics API
 * 
 * Calculates and returns Monthly Recurring Revenue (MRR) and 
 * Annual Recurring Revenue (ARR) metrics for the platform owner.
 * 
 * GET /api/platform/metrics/mrr
 * - Returns current MRR, ARR, and growth metrics
 * 
 * GET /api/platform/metrics/mrr/history
 * - Returns historical MRR/ARR data
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/api-auth-guard';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';
import { db } from '@/services/financial-service/src/db';
import { subscriptionEvents, mrrSnapshots } from '@/services/financial-service/src/db/schema-platform-economics';
import { and, desc, sum } from 'drizzle-orm';
import { logger } from '@/lib/logger';

// Helper to safely parse numeric
const parseNumeric = (val: any, defaultVal = 0): number => {
  if (val === null || val === undefined) return defaultVal;
  const parsed = parseFloat(val.toString());
  return isNaN(parsed) ? defaultVal : parsed;
};

/**
 * GET /api/platform/metrics/mrr
 * Get current MRR/ARR metrics
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireApiAuth();
    const userId = auth.userId;
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Rate limiting
    const rateLimitResult = await checkRateLimit(userId, RATE_LIMITS.FINANCIAL_READ);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', resetIn: rateLimitResult.resetIn },
        { status: 429 }
      );
    }
    
    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || 'current';
    
    // Get current date
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    
    // Try to get from snapshot first (most efficient)
    const latestSnapshot = await db
      .select()
      .from(mrrSnapshots)
      .orderBy(desc(mrrSnapshots.snapshotDate))
      .limit(1)
      .then(rows => rows[0]);
    
    // If we have a recent snapshot, use it
    if (latestSnapshot) {
      const snapshotDate = new Date(latestSnapshot.snapshotDate);
      const snapshotMonth = snapshotDate.getMonth() + 1;
      const snapshotYear = snapshotDate.getFullYear();
      
      // If snapshot is from current month, return it
      if (snapshotMonth === currentMonth && snapshotYear === currentYear) {
        return NextResponse.json({
          success: true,
          data: {
            mrr: parseNumeric(latestSnapshot.totalMrr),
            arr: parseNumeric(latestSnapshot.totalArr),
            mrrGrowthRate: parseNumeric(latestSnapshot.mrrGrowthRate),
            activeSubscriptions: latestSnapshot.activeSubscriptions,
            newSubscriptions: latestSnapshot.newSubscriptions,
            churnedSubscriptions: latestSnapshot.cancelledSubscriptions,
            grossMrr: parseNumeric(latestSnapshot.grossMrr),
            netMrr: parseNumeric(latestSnapshot.netMrr),
            arpu: parseNumeric(latestSnapshot.avgRevenuePerUser),
            breakdown: {
              newMrr: parseNumeric(latestSnapshot.newMrr),
              expansionMrr: parseNumeric(latestSnapshot.expansionMrr),
              contractionMrr: parseNumeric(latestSnapshot.contractionMrr),
              churnMrr: parseNumeric(latestSnapshot.churnMrr),
              reactivationMrr: parseNumeric(latestSnapshot.reactivationMrr),
            },
          },
          period: {
            month: snapshotMonth,
            year: snapshotYear,
          },
        });
      }
    }
    
    // Calculate from subscription events if no recent snapshot
    const startOfMonth = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
    
    // Get all active subscription events
    const events = await db
      .select()
      .from(subscriptionEvents)
      .where(gte(subscriptionEvents.eventDate, startOfMonth))
      .orderBy(desc(subscriptionEvents.eventDate));
    
    // Calculate MRR from events
    let totalMrr = 0;
    let activeCount = 0;
    
    // Group events by organization
    const orgEvents = new Map<string, typeof events[0][]>();
    for (const event of events) {
      const existing = orgEvents.get(event.organizationId) || [];
      existing.push(event);
      orgEvents.set(event.organizationId, existing);
    }
    
    // For each org, get the latest event to determine current state
    for (const [, orgEvts] of orgEvents) {
      const latestEvent = orgEvts[0];
      
      if (['subscription_started', 'subscription_upgraded', 'subscription_reactivated', 'subscription_resumed'].includes(latestEvent.eventType)) {
        totalMrr += parseNumeric(latestEvent.monthlyAmount);
        activeCount++;
      } else if (latestEvent.eventType === 'subscription_downgraded') {
        totalMrr += parseNumeric(latestEvent.monthlyAmount);
        activeCount++;
      }
    }
    
    // Calculate ARR
    const arr = totalMrr * 12;
    
    // Calculate growth rate (compare to last month)
    const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const lastYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    const lastMonthSnapshot = await db
      .select()
      .from(mrrSnapshots)
      .where(
        and(
          eq(mrrSnapshots.snapshotMonth, lastMonth),
          eq(mrrSnapshots.snapshotYear, lastYear)
        )
      )
      .limit(1)
      .then(rows => rows[0]);
    
    let mrrGrowthRate = 0;
    if (lastMonthSnapshot) {
      const lastMrr = parseNumeric(lastMonthSnapshot.totalMrr);
      if (lastMrr > 0) {
        mrrGrowthRate = ((totalMrr - lastMrr) / lastMrr) * 100;
      }
    }
    
    // Calculate ARPU
    const arpu = activeCount > 0 ? totalMrr / activeCount : 0;
    
    // Count new and churned this month
    const newCount = events.filter(e => e.eventType === 'subscription_started').length;
    const churnedCount = events.filter(e => e.eventType === 'subscription_cancelled').length;
    
    return NextResponse.json({
      success: true,
      data: {
        mrr: totalMrr,
        arr: arr,
        mrrGrowthRate: Math.round(mrrGrowthRate * 100) / 100,
        activeSubscriptions: activeCount,
        newSubscriptions: newCount,
        churnedSubscriptions: churnedCount,
        grossMrr: totalMrr,
        netMrr: totalMrr,
        arpu: Math.round(arpu * 100) / 100,
        breakdown: {
          newMrr: 0,
          expansionMrr: 0,
          contractionMrr: 0,
          churnMrr: 0,
          reactivationMrr: 0,
        },
      },
      period: {
        month: currentMonth,
        year: currentYear,
      },
      calculated: true,
    });
    
  } catch (error) {
    logger.error('Error calculating MRR:', error);
    return NextResponse.json(
      { error: 'Failed to calculate MRR metrics', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
