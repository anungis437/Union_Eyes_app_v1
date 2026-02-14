/**
 * Platform Churn Metrics API
 * 
 * Calculates and returns subscription churn metrics including:
 * - Customer churn rate
 * - Revenue churn rate
 * - Net revenue retention (NRR)
 * - Cohort retention
 * 
 * GET /api/platform/metrics/churn
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/api-auth-guard';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';
import { db } from '@/services/financial-service/src/db';
import { subscriptionEvents, mrrSnapshots, customerAcquisition } from '@/services/financial-service/src/db/schema-platform-economics';
import { eq, and, desc, gte, lte, sql, count, sum } from 'drizzle-orm';

// Helper to safely parse numeric
const parseNumeric = (val: any, defaultVal = 0): number => {
  if (val === null || val === undefined) return defaultVal;
  const parsed = parseFloat(val.toString());
  return isNaN(parsed) ? defaultVal : parsed;
};

/**
 * GET /api/platform/metrics/churn
 * Get churn metrics
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
    const period = searchParams.get('period') || 'monthly'; // monthly, quarterly, yearly
    const months = period === 'yearly' ? 12 : period === 'quarterly' ? 3 : 1;
    
    // Get current date
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    
    // Get subscription events for the period
    const periodStart = new Date(now);
    periodStart.setMonth(periodStart.getMonth() - months);
    const periodStartStr = periodStart.toISOString().split('T')[0];
    
    // Count new subscriptions
    const newSubscriptions = await db
      .select({ count: count() })
      .from(subscriptionEvents)
      .where(
        and(
          eq(subscriptionEvents.eventType, 'subscription_started'),
          gte(subscriptionEvents.eventDate, periodStartStr)
        )
      )
      .then(rows => rows[0]?.count || 0);
    
    // Count cancellations
    const cancelledSubscriptions = await db
      .select({ count: count() })
      .from(subscriptionEvents)
      .where(
        and(
          eq(subscriptionEvents.eventType, 'subscription_cancelled'),
          gte(subscriptionEvents.eventDate, periodStartStr)
        )
      )
      .then(rows => rows[0]?.count || 0);
    
    // Count total active (from latest snapshot)
    const latestSnapshot = await db
      .select()
      .from(mrrSnapshots)
      .orderBy(desc(mrrSnapshots.snapshotDate))
      .limit(1)
      .then(rows => rows[0]);
    
    const totalActive = latestSnapshot ? (latestSnapshot.activeSubscriptions ?? 0) : 0;
    
    // Calculate customer churn rate
    const startOfPeriodActive = totalActive + cancelledSubscriptions - newSubscriptions;
    const customerChurnRate = startOfPeriodActive > 0 
      ? (cancelledSubscriptions / startOfPeriodActive) * 100 
      : 0;
    
    // Calculate revenue churn (from MRR)
    const churnMrr = latestSnapshot ? parseNumeric(latestSnapshot.churnMrr) : 0;
    const grossMrr = latestSnapshot ? parseNumeric(latestSnapshot.grossMrr) : 0;
    const revenueChurnRate = grossMrr > 0 ? (churnMrr / grossMrr) * 100 : 0;
    
    // Calculate net revenue retention (NRR)
    const newMrr = latestSnapshot ? parseNumeric(latestSnapshot.newMrr) : 0;
    const expansionMrr = latestSnapshot ? parseNumeric(latestSnapshot.expansionMrr) : 0;
    const contractionMrr = latestSnapshot ? parseNumeric(latestSnapshot.contractionMrr) : 0;
    const netMrr = grossMrr - churnMrr + newMrr;
    const nrr = grossMrr > 0 ? (netMrr / grossMrr) * 100 : 100;
    
    // Calculate gross revenue retention (GRR) - without new/expansion
    const grr = grossMrr > 0 ? ((grossMrr - churnMrr) / grossMrr) * 100 : 100;
    
    // Get churned customers for LTV calculation
    const churnedCustomers = await db
      .select()
      .from(customerAcquisition)
      .where(eq(customerAcquisition.status, 'churned'))
      .then(rows => rows);
    
    // Calculate average LTV of churned customers
    let avgChurnedLtv = 0;
    if (churnedCustomers.length > 0) {
      const totalLtv = churnedCustomers.reduce((sum, c) => sum + parseNumeric(c.calculatedLtv), 0);
      avgChurnedLtv = totalLtv / churnedCustomers.length;
    }
    
    // Calculate quick LTV (simplified): ARPU * 24 months (typical SaaS lifetime)
    const arpu = latestSnapshot ? parseNumeric(latestSnapshot.avgRevenuePerUser) : 0;
    const quickLtv = arpu * 24;
    
    return NextResponse.json({
      success: true,
      data: {
        // Customer metrics
        customerChurnRate: Math.round(customerChurnRate * 100) / 100,
        newSubscriptions,
        cancelledSubscriptions,
        totalActive,
        
        // Revenue metrics
        revenueChurnRate: Math.round(revenueChurnRate * 100) / 100,
        churnMrr,
        grossMrr,
        
        // Retention metrics
        netRevenueRetention: Math.round(nrr * 100) / 100,
        grossRevenueRetention: Math.round(grr * 100) / 100,
        
        // Expansion/contraction
        expansionMrr,
        contractionMrr,
        
        // LTV insights
        quickLtv: Math.round(quickLtv * 100) / 100,
        avgChurnedLtv: Math.round(avgChurnedLtv * 100) / 100,
        
        // Period info
        period,
        months,
      },
      calculatedAt: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Error calculating churn metrics:', error);
    return NextResponse.json(
      { error: 'Failed to calculate churn metrics', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
