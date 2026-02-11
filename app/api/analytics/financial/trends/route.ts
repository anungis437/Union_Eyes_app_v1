import { NextRequest, NextResponse } from 'next/server';
import { withApiAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { client } from '@/db/db';

async function handler(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.tenantId) {
      return NextResponse.json(
        { error: 'Authentication and tenant context required' },
        { status: 401 }
      );
    }
    
    const tenantId = user.tenantId;
    const searchParams = req.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '90');
    const groupBy = searchParams.get('groupBy') || 'weekly';

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Determine date format based on grouping
    let dateFormat: string;
    let intervalStr: string;
    
    switch (groupBy) {
      case 'daily':
        dateFormat = 'YYYY-MM-DD';
        intervalStr = '1 day';
        break;
      case 'monthly':
        dateFormat = 'YYYY-MM';
        intervalStr = '1 month';
        break;
      case 'weekly':
      default:
        dateFormat = 'YYYY-"W"IW';
        intervalStr = '1 week';
        break;
    }

    // Use simplified approach with drizzle query builder
    const result = await client`
      WITH date_series AS (
        SELECT 
          generate_series(
            date_trunc(${groupBy === 'monthly' ? 'month' : 'day'}, ${startDate.toISOString()}::timestamp),
            date_trunc(${groupBy === 'monthly' ? 'month' : 'day'}, NOW()),
            ${intervalStr}::interval
          ) AS period_start
      ),
      claim_financials AS (
        SELECT
          date_trunc(${groupBy === 'monthly' ? 'month' : 'day'}, c.filed_date) as period_start,
          COALESCE(SUM(c.claim_amount), 0) as claim_value,
          COALESCE(SUM(CASE WHEN c.resolution_outcome = 'won' THEN c.settlement_amount ELSE 0 END), 0) as settlements,
          COALESCE(SUM(c.legal_costs + COALESCE(c.court_costs, 0)), 0) as costs
        FROM claims c
        WHERE c.tenant_id = ${tenantId}
          AND c.filed_date >= ${startDate.toISOString()}
        GROUP BY date_trunc(${groupBy === 'monthly' ? 'month' : 'day'}, c.filed_date)
      )
      SELECT
        TO_CHAR(ds.period_start, ${dateFormat}) as date,
        COALESCE(cf.claim_value, 0) as "claimValue",
        COALESCE(cf.settlements, 0) as settlements,
        COALESCE(cf.costs, 0) as costs,
        COALESCE(cf.settlements - cf.costs, 0) as "netValue"
      FROM date_series ds
      LEFT JOIN claim_financials cf ON ds.period_start = cf.period_start
      ORDER BY ds.period_start
    `;

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error fetching financial trends:', error);
    return NextResponse.json(
      { error: 'Failed to fetch financial trends' },
      { status: 500 }
    );
  }
}

export const GET = withApiAuth(handler);

