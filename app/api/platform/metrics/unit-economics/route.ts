/**
 * Platform Unit Economics Dashboard API
 * 
 * Returns comprehensive unit economics including:
 * - Customer Lifetime Value (LTV)
 * - Customer Acquisition Cost (CAC)
 * - LTV:CAC ratio
 * - Payback period
 * - Cohort analysis
 * 
 * GET /api/platform/metrics/unit-economics
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/api-auth-guard';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';
import { db } from '@/services/financial-service/src/db';
import { subscriptionEvents, mrrSnapshots, customerAcquisition, revenueCohorts } from '@/services/financial-service/src/db/schema-platform-economics';
import { and, desc, count, sum, avg } from 'drizzle-orm';
import { logger } from '@/lib/logger';

// Helper to safely parse numeric
const parseNumeric = (val: any, defaultVal = 0): number => {
  if (val === null || val === undefined) return defaultVal;
  const parsed = parseFloat(val.toString());
  return isNaN(parsed) ? defaultVal : parsed;
};

/**
 * GET /api/platform/metrics/unit-economics
 * Get unit economics dashboard data
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
    
    // Get latest MRR snapshot for ARPU
    const latestSnapshot = await db
      .select()
      .from(mrrSnapshots)
      .orderBy(desc(mrrSnapshots.snapshotDate))
      .limit(1)
      .then(rows => rows[0]);
    
    const arpu = latestSnapshot ? parseNumeric(latestSnapshot.avgRevenuePerUser) : 0;
    const currentMrr = latestSnapshot ? parseNumeric(latestSnapshot.totalMrr) : 0;
    
    // Calculate LTV (using simple formula: ARPU * gross margin / churn rate)
    // Assuming 80% gross margin and 5% monthly churn
    const grossMargin = 0.80;
    const monthlyChurnRate = 0.05; // 5% - typical SaaS
    const ltv = arpu > 0 && monthlyChurnRate > 0 
      ? (arpu * grossMargin) / monthlyChurnRate 
      : arpu * 24; // Fallback: 24 month lifetime
    
    // Get CAC from acquisition data
    const acquisitionData = await db
      .select({
        totalCost: sum(customerAcquisition.totalAcquisitionCost),
        count: count(),
        avgCost: avg(customerAcquisition.totalAcquisitionCost),
      })
      .from(customerAcquisition);
    
    const totalMarketingCost = parseNumeric(acquisitionData[0]?.totalCost);
    const totalCustomers = acquisitionData[0]?.count || 0;
    const avgCac = totalCustomers > 0 ? totalMarketingCost / totalCustomers : 0;
    
    // Calculate LTV:CAC ratio
    const ltvCacRatio = avgCac > 0 ? ltv / avgCac : 0;
    
    // Calculate payback period (months)
    const paybackMonths = arpu > 0 ? avgCac / arpu : 0;
    
    // Get cohort data
    const cohorts = await db
      .select()
      .from(revenueCohorts)
      .orderBy(desc(revenueCohorts.cohortYear), desc(revenueCohorts.cohortMonth))
      .limit(12);
    
    // Format cohort data for response
    const cohortData = cohorts.map(c => ({
      cohort: `${c.cohortYear}-${String(c.cohortMonth).padStart(2, '0')}`,
      customersAtStart: c.customersAtStart,
      totalLtv: parseNumeric(c.totalLtv),
      averageLtv: parseNumeric(c.averageLtv),
      retention: {
        month1: parseNumeric(c.month1Retention),
        month3: parseNumeric(c.month3Retention),
        month6: parseNumeric(c.month6Retention),
        month12: parseNumeric(c.month12Retention),
      },
      revenue: {
        month1: parseNumeric(c.month1Revenue),
        month3: parseNumeric(c.month3Revenue),
        month6: parseNumeric(c.month6Revenue),
        month12: parseNumeric(c.month12Revenue),
      },
    }));
    
    // Get acquisition trends (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const acquisitionTrends = await db
      .select({
        cohortMonth: customerAcquisition.cohortMonth,
        cohortYear: customerAcquisition.cohortYear,
        totalCost: sum(customerAcquisition.totalAcquisitionCost),
        customerCount: count(),
        totalRevenue: sum(customerAcquisition.totalRevenue),
        avgMrr: avg(customerAcquisition.currentMrr),
      })
      .from(customerAcquisition)
      .where(gte(customerAcquisition.acquisitionDate, sixMonthsAgo.toISOString()))
      .groupBy(customerAcquisition.cohortYear, customerAcquisition.cohortMonth)
      .orderBy(desc(customerAcquisition.cohortYear), desc(customerAcquisition.cohortMonth));
    
    const trendsData = acquisitionTrends.map(t => ({
      cohort: `${t.cohortYear}-${String(t.cohortMonth).padStart(2, '0')}`,
      customers: t.customerCount,
      totalCost: parseNumeric(t.totalCost),
      totalRevenue: parseNumeric(t.totalRevenue),
      avgMrr: parseNumeric(t.avgMrr),
      cac: t.customerCount > 0 ? parseNumeric(t.totalCost) / t.customerCount : 0,
    }));
    
    // Calculate platform efficiency scores
    const efficiency = {
      ltvCacRatio: Math.round(ltvCacRatio * 10) / 10,
      paybackMonths: Math.round(paybackMonths * 10) / 10,
      ltv: Math.round(ltv * 100) / 100,
      cac: Math.round(avgCac * 100) / 100,
      arpu: Math.round(arpu * 100) / 100,
      grossMargin: grossMargin * 100,
    };
    
    // Health indicators
    const health = {
      ltvCacStatus: ltvCacRatio >= 3 ? 'excellent' : ltvCacRatio >= 1 ? 'good' : 'needs_improvement',
      paybackStatus: paybackMonths <= 12 ? 'excellent' : paybackMonths <= 18 ? 'good' : 'needs_improvement',
      nrrStatus: latestSnapshot ? parseNumeric(latestSnapshot.mrrGrowthRate) >= 0 ? 'growing' : 'shrinking' : 'unknown',
    };
    
    return NextResponse.json({
      success: true,
      data: {
        // Core metrics
        unitEconomics: efficiency,
        
        // Health indicators
        health,
        
        // Breakdown
        breakdown: {
          ltv: {
            formula: 'ARPU × Gross Margin / Churn Rate',
            calculation: `${arpu.toFixed(2)} × ${(grossMargin * 100).toFixed(0)}% / ${(monthlyChurnRate * 100).toFixed(0)}%`,
            value: Math.round(ltv * 100) / 100,
          },
          cac: {
            formula: 'Total Marketing Cost / Customers Acquired',
            calculation: totalCustomers > 0 
              ? `${totalMarketingCost.toFixed(2)} / ${totalCustomers}`
              : 'No data',
            value: Math.round(avgCac * 100) / 100,
          },
          paybackPeriod: {
            formula: 'CAC / ARPU',
            calculation: `${avgCac.toFixed(2)} / ${arpu.toFixed(2)}`,
            value: Math.round(paybackMonths * 10) / 10,
          },
        },
        
        // Historical data
        cohorts: cohortData,
        trends: trendsData,
        
        // Summary
        summary: {
          totalCustomers,
          totalMarketingSpend: totalMarketingCost,
          currentMrr,
          customerLtv: ltv,
        },
      },
      calculatedAt: new Date().toISOString(),
    });
    
  } catch (error) {
    logger.error('Error calculating unit economics:', error);
    return NextResponse.json(
      { error: 'Failed to calculate unit economics', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
