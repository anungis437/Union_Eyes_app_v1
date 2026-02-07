/**
 * Member Cohort Analysis API
 * 
 * GET /api/analytics/members/cohorts
 * Returns cohort-based retention analysis grouped by signup month
 */

import { NextRequest, NextResponse } from 'next/server';
import { withTenantAuth } from '@/lib/tenant-middleware';
import { sql, db } from '@/db';
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";

interface CohortData {
  cohortMonth: string;
  size: number;
  active: number;
  retentionRate: number;
  avgLifetimeClaims: number;
}

async function handler(req: NextRequest, context) {
  try {
    const tenantId = context.tenantId;
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID required' },
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
}

export const GET = withTenantAuth(handler);
