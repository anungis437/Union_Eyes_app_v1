/**
 * Member Cohort Analysis API
 * 
 * GET /api/analytics/members/cohorts
 * Returns cohort-based retention analysis grouped by signup month
 */

import { NextRequest, NextResponse } from 'next/server';
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';
import { sql, db } from '@/db';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';
import { logApiAuditEvent } from '@/lib/middleware/request-validation';

interface CohortData {
  cohortMonth: string;
  size: number;
  active: number;
  retentionRate: number;
  avgLifetimeClaims: number;
}

export const GET = withEnhancedRoleAuth(40, async (req: NextRequest, context) => {
  const { userId, organizationId } = context;

  // Rate limit cohort analytics
  const rateLimitResult = await checkRateLimit(
    RATE_LIMITS.ANALYTICS_QUERY,
    `analytics-cohorts:${userId}`
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
    const monthsBack = parseInt(url.searchParams.get('months') || '12');

    // Calculate cohort metrics
    const cohorts = await db.execute(sql`
      WITH cohort_members AS (
        SELECT 
          id,
          TO_CHAR(created_at, 'YYYY-MM') AS cohort_month,
          created_at
        FROM organization_members
        WHERE tenant_id = ${tenantId}
          AND created_at >= DATE_TRUNC('month', NOW()) - INTERVAL '${monthsBack} months'
      ),
      member_activity AS (
        SELECT 
          cm.id,
          cm.cohort_month,
          COUNT(c.id) AS lifetime_claims,
          MAX(c.created_at) AS last_claim_date,
          CASE 
            WHEN MAX(c.created_at) >= NOW() - INTERVAL '90 days' THEN true
            ELSE false
          END AS is_active
        FROM cohort_members cm
        LEFT JOIN claims c ON c.member_id = cm.id AND c.tenant_id = ${tenantId}
        GROUP BY cm.id, cm.cohort_month
      )
      SELECT 
        cohort_month,
        COUNT(*) AS size,
        COUNT(*) FILTER (WHERE is_active) AS active,
        ROUND(100.0 * COUNT(*) FILTER (WHERE is_active) / COUNT(*), 1) AS retention_rate,
        ROUND(AVG(lifetime_claims), 1) AS avg_lifetime_claims
      FROM member_activity
      GROUP BY cohort_month
      ORDER BY cohort_month DESC
    `) as any[];

    const cohortData: CohortData[] = cohorts.map(row => ({
      cohortMonth: row.cohort_month,
      size: parseInt(row.size),
      active: parseInt(row.active),
      retentionRate: parseFloat(row.retention_rate),
      avgLifetimeClaims: parseFloat(row.avg_lifetime_claims),
    }));

    return NextResponse.json(cohortData);
  } catch (error) {
    console.error('Cohort analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cohort analysis' },
      { status: 500 }
    );
  }
});
