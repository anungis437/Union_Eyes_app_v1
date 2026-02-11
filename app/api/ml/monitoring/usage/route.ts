import { NextRequest, NextResponse } from 'next/server';
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';
import { checkRateLimit, RATE_LIMITS, createRateLimitHeaders } from '@/lib/rate-limiter';
import { logApiAuditEvent } from '@/lib/middleware/api-security';
import { db } from '@/db';
import { sql } from 'drizzle-orm';

/**
 * GET /api/ml/monitoring/usage
 * 
 * Returns AI feature usage statistics and adoption metrics
 * 
 * Query parameters:
 * - days: number (default: 30) - Number of days to include
 * 
 * Response:
 * {
 *   dailyMetrics: [{
 *     date: string,
 *     activeUsers: number,
 *     predictions: number,
 *     avgResponseTime: number
 *   }],
 *   featureBreakdown: [{
 *     feature: string,
 *     uses: number,
 *     uniqueUsers: number
 *   }],
 *   adoptionRate: number,    // Percentage of active stewards using AI
 *   totalPredictions: number
 * }
 */
export const GET = withEnhancedRoleAuth(20, async (request: NextRequest, context) => {
  const { userId, organizationId } = context;

  // Rate limit monitoring reads
  const rateLimitResult = await checkRateLimit(
    `ml-predictions:${userId}`,
    RATE_LIMITS.ML_PREDICTIONS
  );

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded for ML operations. Please try again later.' },
      { 
        status: 429,
        headers: createRateLimitHeaders(rateLimitResult)
      }
    );
  }

  try {
    const organizationScopeId = organizationId || userId;
    const tenantId = organizationScopeId;
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');

    if (days < 1 || days > 365) {
      return NextResponse.json(
        { error: 'days must be between 1 and 365' },
        { status: 400 }
      );
    }

    // Query daily usage metrics
    const dailyMetricsData = await db.execute(sql`
      SELECT 
        DATE(predicted_at) as date,
        COUNT(DISTINCT user_id) as active_users,
        COUNT(*) as predictions,
        AVG(response_time_ms) as avg_response_time
      FROM ml_predictions
      WHERE tenant_id = ${tenantId}
        AND predicted_at >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(predicted_at)
      ORDER BY date DESC
    `);

    const dailyMetrics = (dailyMetricsData || []).map((row: any) => ({
      date: row.date,
      activeUsers: parseInt(row.active_users || 0),
      predictions: parseInt(row.predictions || 0),
      avgResponseTime: parseFloat(row.avg_response_time || 0)
    }));

    // Query feature usage breakdown
    const featureBreakdownData = await db.execute(sql`
      SELECT 
        CASE 
          WHEN model_type = 'claim_outcome' THEN 'Claim Outcome Prediction'
          WHEN model_type = 'timeline' THEN 'Timeline Forecasting'
          WHEN model_type = 'churn_risk' THEN 'Churn Risk Prediction'
          WHEN model_type = 'assignment' THEN 'Smart Assignment'
          WHEN model_type = 'precedent' THEN 'Legal Precedent Search'
          WHEN model_type = 'nl_query' THEN 'Natural Language Query'
          ELSE model_type
        END as feature,
        COUNT(*) as uses,
        COUNT(DISTINCT user_id) as unique_users
      FROM ml_predictions
      WHERE tenant_id = ${tenantId}
        AND predicted_at >= NOW() - INTERVAL '${days} days'
      GROUP BY model_type
      ORDER BY uses DESC
    `);

    const featureBreakdown = (featureBreakdownData || []).map((row: any) => ({
      feature: row.feature,
      uses: parseInt(row.uses || 0),
      uniqueUsers: parseInt(row.unique_users || 0)
    }));

    // Calculate adoption rate
    const adoptionData = await db.execute(sql`
      WITH active_stewards AS (
        SELECT COUNT(DISTINCT user_id) as total
        FROM claims
        WHERE tenant_id = ${tenantId}
          AND created_at >= NOW() - INTERVAL '30 days'
      ),
      ai_users AS (
        SELECT COUNT(DISTINCT user_id) as total
        FROM ml_predictions
        WHERE tenant_id = ${tenantId}
          AND predicted_at >= NOW() - INTERVAL '30 days'
      )
      SELECT 
        COALESCE(ai_users.total, 0) as ai_users,
        COALESCE(active_stewards.total, 1) as active_stewards,
        CASE 
          WHEN active_stewards.total > 0 
          THEN (ai_users.total::float / active_stewards.total::float * 100)
          ELSE 0 
        END as adoption_rate
      FROM active_stewards, ai_users
    `);

    const adoptionRow = adoptionData?.[0] as any;
    const adoptionRate = parseFloat(adoptionRow?.adoption_rate || '0');

    // Total predictions count
    const totalPredictions = dailyMetrics.reduce((sum: number, day: any) => sum + day.predictions, 0);

    return NextResponse.json({
      dailyMetrics,
      featureBreakdown,
      adoptionRate,
      totalPredictions
    });

  } catch (error) {
return NextResponse.json(
      { error: 'Failed to fetch usage metrics' },
      { status: 500 }
    );
  }
});

