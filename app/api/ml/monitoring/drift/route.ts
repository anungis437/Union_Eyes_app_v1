import { NextRequest, NextResponse } from 'next/server';
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';
import { checkRateLimit, RATE_LIMITS, createRateLimitHeaders } from '@/lib/rate-limiter';
import { logApiAuditEvent } from '@/lib/middleware/api-security';
import { db } from '@/db';
import { sql } from 'drizzle-orm';

/**
 * GET /api/ml/monitoring/drift
 * 
 * Returns data drift metrics using Population Stability Index (PSI)
 * Monitors feature distributions vs baseline for all active models
 * 
 * Alert Threshold: PSI > 0.25 indicates significant drift
 * 
 * Response:
 * {
 *   metrics: [{
 *     metric: string,          // Feature name or distribution
 *     currentValue: number,    // Current mean/median
 *     baselineValue: number,   // Baseline mean/median
 *     psiScore: number,        // Population Stability Index
 *     threshold: number,       // Alert threshold (0.25)
 *     status: 'healthy' | 'warning' | 'critical'
 *   }],
 *   lastChecked: string
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

    // Query drift metrics from feature monitoring tables
    // Build on existing benchmark_data structure
    const driftMetrics = await db.execute(sql`
      WITH feature_distributions AS (
        -- Calculate current feature distributions (last 7 days)
        SELECT 
          'Feature: Member Age' as metric,
          AVG(member_age) as current_value,
          STDDEV(member_age) as current_stddev
        FROM claims c
        JOIN profiles p ON p.user_id = c.created_by
        WHERE c.tenant_id = ${tenantId}
          AND c.created_at >= NOW() - INTERVAL '7 days'
        
        UNION ALL
        
        SELECT 
          'Feature: Case Complexity' as metric,
          AVG(CASE 
            WHEN c.case_type = 'termination' THEN 5
            WHEN c.case_type = 'discipline' THEN 4
            WHEN c.case_type = 'harassment' THEN 4
            WHEN c.case_type = 'discrimination' THEN 5
            WHEN c.case_type = 'health_safety' THEN 3
            ELSE 2
          END) as current_value,
          STDDEV(CASE 
            WHEN c.case_type = 'termination' THEN 5
            WHEN c.case_type = 'discipline' THEN 4
            WHEN c.case_type = 'harassment' THEN 4
            WHEN c.case_type = 'discrimination' THEN 5
            WHEN c.case_type = 'health_safety' THEN 3
            ELSE 2
          END) as current_stddev
        FROM claims c
        WHERE c.tenant_id = ${tenantId}
          AND c.created_at >= NOW() - INTERVAL '7 days'
        
        UNION ALL
        
        SELECT 
          'Feature: Union Tenure' as metric,
          AVG(EXTRACT(YEAR FROM AGE(NOW(), p.union_join_date))) as current_value,
          STDDEV(EXTRACT(YEAR FROM AGE(NOW(), p.union_join_date))) as current_stddev
        FROM claims c
        JOIN profiles p ON p.user_id = c.created_by
        WHERE c.tenant_id = ${tenantId}
          AND c.created_at >= NOW() - INTERVAL '7 days'
          AND p.union_join_date IS NOT NULL
        
        UNION ALL
        
        SELECT 
          'Prediction Distribution' as metric,
          AVG(predicted_outcome::int) as current_value,
          STDDEV(predicted_outcome::int) as current_stddev
        FROM ml_predictions
        WHERE tenant_id = ${tenantId}
          AND predicted_at >= NOW() - INTERVAL '7 days'
          AND model_type = 'claim_outcome'
      ),
      baseline_distributions AS (
        -- Get baseline distributions from model training period
        SELECT 
          metric_name as metric,
          baseline_value,
          baseline_stddev
        FROM model_feature_baselines
        WHERE tenant_id = ${tenantId}
          AND is_active = true
      )
      SELECT 
        fd.metric,
        fd.current_value,
        COALESCE(bd.baseline_value, fd.current_value) as baseline_value,
        -- Calculate PSI (simplified)
        ABS(fd.current_value - COALESCE(bd.baseline_value, fd.current_value)) / 
          NULLIF(COALESCE(bd.baseline_value, fd.current_value), 0) as psi_score,
        0.25 as threshold,
        CASE 
          WHEN ABS(fd.current_value - COALESCE(bd.baseline_value, fd.current_value)) / 
               NULLIF(COALESCE(bd.baseline_value, fd.current_value), 0) >= 0.25 THEN 'critical'
          WHEN ABS(fd.current_value - COALESCE(bd.baseline_value, fd.current_value)) / 
               NULLIF(COALESCE(bd.baseline_value, fd.current_value), 0) >= 0.20 THEN 'warning'
          ELSE 'healthy'
        END as status
      FROM feature_distributions fd
      LEFT JOIN baseline_distributions bd ON bd.metric = fd.metric
      WHERE fd.current_value IS NOT NULL
      ORDER BY psi_score DESC
    `);

    const metrics = (driftMetrics || []).map((row: any) => ({
      metric: row.metric,
      currentValue: parseFloat(row.current_value || 0),
      baselineValue: parseFloat(row.baseline_value || 0),
      psiScore: parseFloat(row.psi_score || 0),
      threshold: parseFloat(row.threshold || 0.25),
      status: row.status || 'healthy'
    }));

    return NextResponse.json({
      metrics,
      lastChecked: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching drift metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch drift metrics' },
      { status: 500 }
    );
  }
});
