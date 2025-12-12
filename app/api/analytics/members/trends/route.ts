/**
 * Member Engagement Trends API
 * 
 * GET /api/analytics/members/trends
 * Returns monthly trends for member engagement metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { withTenantAuth } from '@/lib/tenant-middleware';
import { sql, db } from '@/lib/db';

interface EngagementTrend {
  month: string;
  activeMembers: number;
  newMembers: number;
  churnedMembers: number;
  engagementScore: number;
}

async function handler(req: NextRequest) {
  try {
    const tenantId = req.headers.get('x-tenant-id');
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID required' },
        { status: 400 }
      );
    }

    const url = new URL(req.url);
    const monthsBack = parseInt(url.searchParams.get('months') || '12');

    // Get monthly engagement trends
    const trends = await db.execute(sql`
      WITH monthly_members AS (
        SELECT 
          TO_CHAR(month_series, 'YYYY-MM') AS month,
          month_series
        FROM generate_series(
          DATE_TRUNC('month', NOW()) - INTERVAL '${monthsBack} months',
          DATE_TRUNC('month', NOW()),
          '1 month'::interval
        ) AS month_series
      ),
      new_members AS (
        SELECT 
          TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month,
          COUNT(*) AS new_count
        FROM organization_members
        WHERE tenant_id = ${tenantId}
        GROUP BY TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM')
      ),
      active_members AS (
        SELECT 
          TO_CHAR(DATE_TRUNC('month', c.created_at), 'YYYY-MM') AS month,
          COUNT(DISTINCT c.member_id) AS active_count,
          AVG(
            CASE 
              WHEN MAX(c.created_at) OVER (PARTITION BY c.member_id) >= DATE_TRUNC('month', c.created_at) - INTERVAL '30 days' THEN 100
              WHEN MAX(c.created_at) OVER (PARTITION BY c.member_id) >= DATE_TRUNC('month', c.created_at) - INTERVAL '90 days' THEN 75
              WHEN MAX(c.created_at) OVER (PARTITION BY c.member_id) >= DATE_TRUNC('month', c.created_at) - INTERVAL '180 days' THEN 50
              ELSE 25
            END
          ) AS avg_engagement_score
        FROM claims c
        WHERE c.tenant_id = ${tenantId}
        GROUP BY TO_CHAR(DATE_TRUNC('month', c.created_at), 'YYYY-MM')
      ),
      churned_estimate AS (
        -- Estimate churned as members who haven't been active in 180+ days
        SELECT 
          TO_CHAR(DATE_TRUNC('month', last_activity + INTERVAL '180 days'), 'YYYY-MM') AS month,
          COUNT(*) AS churned_count
        FROM (
          SELECT 
            member_id,
            MAX(created_at) AS last_activity
          FROM claims
          WHERE tenant_id = ${tenantId}
          GROUP BY member_id
          HAVING MAX(created_at) < NOW() - INTERVAL '180 days'
        ) AS inactive_members
        GROUP BY TO_CHAR(DATE_TRUNC('month', last_activity + INTERVAL '180 days'), 'YYYY-MM')
      )
      SELECT 
        mm.month,
        COALESCE(am.active_count, 0) AS active_members,
        COALESCE(nm.new_count, 0) AS new_members,
        COALESCE(ce.churned_count, 0) AS churned_members,
        COALESCE(am.avg_engagement_score, 0) AS engagement_score
      FROM monthly_members mm
      LEFT JOIN new_members nm ON nm.month = mm.month
      LEFT JOIN active_members am ON am.month = mm.month
      LEFT JOIN churned_estimate ce ON ce.month = mm.month
      ORDER BY mm.month_series
    `) as any[];

    const engagementTrends: EngagementTrend[] = trends.map(row => ({
      month: row.month,
      activeMembers: parseInt(row.active_members),
      newMembers: parseInt(row.new_members),
      churnedMembers: parseInt(row.churned_members),
      engagementScore: Math.round(parseFloat(row.engagement_score)),
    }));

    return NextResponse.json(engagementTrends);
  } catch (error) {
    console.error('Engagement trends error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch engagement trends' },
      { status: 500 }
    );
  }
}

export const GET = withTenantAuth(handler);
