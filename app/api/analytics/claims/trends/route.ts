/**
 * Claims Trends API with Forecasting
 * 
 * GET /api/analytics/claims/trends
 * Returns time-series data for claims with optional ML-based forecasting
 */

import { NextRequest, NextResponse } from 'next/server';
import { withOrganizationAuth } from '@/lib/organization-middleware';
import { sql, db } from '@/db';
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';

interface TrendDataPoint {
  date: string;
  newClaims: number;
  resolvedClaims: number;
  avgResolutionDays: number;
  forecast?: number;
}

async function handler(req: NextRequest, context) {
  try {
    const organizationId = context.organizationId;
    const tenantId = organizationId;
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID required' },
        { status: 400 }
      );
    }

    const url = new URL(req.url);
    const daysBack = parseInt(url.searchParams.get('days') || '30');
    const groupBy = url.searchParams.get('groupBy') || 'daily';
    const includeForecast = url.searchParams.get('forecast') === 'true';
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    // Determine date grouping based on groupBy parameter
    let dateFormat: string;
    let dateInterval: string;
    
    switch (groupBy) {
      case 'weekly':
        dateFormat = 'YYYY-"W"IW'; // ISO week format
        dateInterval = '7 days';
        break;
      case 'monthly':
        dateFormat = 'YYYY-MM';
        dateInterval = '1 month';
        break;
      default: // daily
        dateFormat = 'YYYY-MM-DD';
        dateInterval = '1 day';
    }

    // Get historical trends
    const trends = await db.execute(sql`
      WITH date_series AS (
        SELECT generate_series(
          ${startDate}::date,
          ${endDate}::date,
          ${dateInterval}::interval
        )::date AS report_date
      )
      SELECT 
        TO_CHAR(ds.report_date, ${dateFormat}) AS date,
        COALESCE(COUNT(c1.id), 0) AS new_claims,
        COALESCE(COUNT(c2.id), 0) AS resolved_claims,
        COALESCE(AVG(EXTRACT(EPOCH FROM (c2.resolved_at - c2.created_at))/86400.0), 0) AS avg_resolution_days
      FROM date_series ds
      LEFT JOIN claims c1 ON 
        c1.tenant_id = ${tenantId} AND
        TO_CHAR(c1.created_at, ${dateFormat}) = TO_CHAR(ds.report_date, ${dateFormat})
      LEFT JOIN claims c2 ON 
        c2.tenant_id = ${tenantId} AND
        c2.resolved_at IS NOT NULL AND
        TO_CHAR(c2.resolved_at, ${dateFormat}) = TO_CHAR(ds.report_date, ${dateFormat})
      GROUP BY ds.report_date
      ORDER BY ds.report_date
    `) as any[];

    const trendData: TrendDataPoint[] = trends.map(row => ({
      date: row.date,
      newClaims: parseInt(row.new_claims),
      resolvedClaims: parseInt(row.resolved_claims),
      avgResolutionDays: parseFloat(row.avg_resolution_days),
    }));

    // Simple linear regression forecasting if requested
    if (includeForecast && trendData.length > 3) {
      const forecastPeriods = Math.min(7, Math.floor(trendData.length * 0.3)); // Forecast 30% ahead, max 7 periods
      const forecasts = simpleLinearForecast(
        trendData.map(d => d.newClaims),
        forecastPeriods
      );

      // Add forecast values to the last few data points
      for (let i = 0; i < forecastPeriods && i < trendData.length; i++) {
        const idx = trendData.length - forecastPeriods + i;
        if (idx >= 0) {
          trendData[idx].forecast = forecasts[i];
        }
      }
    }

    return NextResponse.json(trendData);
  } catch (error) {
    console.error('Claims trends error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch claims trends' },
      { status: 500 }
    );
  }
}

/**
 * Simple linear regression forecast
 * Uses least squares method to predict future values
 */
function simpleLinearForecast(data: number[], periods: number): number[] {
  const n = data.length;
  if (n < 2) return Array(periods).fill(data[0] || 0);

  // Calculate means
  const xMean = (n - 1) / 2;
  const yMean = data.reduce((sum, val) => sum + val, 0) / n;

  // Calculate slope (β1) and intercept (β0)
  let numerator = 0;
  let denominator = 0;
  
  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (data[i] - yMean);
    denominator += (i - xMean) ** 2;
  }

  const slope = denominator !== 0 ? numerator / denominator : 0;
  const intercept = yMean - slope * xMean;

  // Generate forecasts
  const forecasts: number[] = [];
  for (let i = 0; i < periods; i++) {
    const x = n + i;
    const forecast = intercept + slope * x;
    forecasts.push(Math.max(0, Math.round(forecast))); // Ensure non-negative
  }

  return forecasts;
}

export const GET = withApiAuth(handler);
