import { NextRequest, NextResponse } from 'next/server';
import { withOrganizationAuth } from '@/lib/organization-middleware';
import { client } from '@/db/db';
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';

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

    const searchParams = req.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '90');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const result = await client`
      WITH outcome_totals AS (
        SELECT
          COALESCE(c.resolution_outcome, 'pending') as outcome,
          COUNT(*) as count,
          COALESCE(SUM(c.claim_amount), 0) as total_value,
          COALESCE(AVG(c.claim_amount), 0) as avg_value
        FROM claims c
        WHERE c.tenant_id = ${tenantId}
          AND c.filed_date >= ${startDate.toISOString()}
        GROUP BY c.resolution_outcome
      ),
      total_claims AS (
        SELECT COUNT(*) as total
        FROM claims
        WHERE tenant_id = ${tenantId}
          AND filed_date >= ${startDate.toISOString()}
      )
      SELECT
        ot.outcome,
        ot.count::int,
        ot.total_value::float as "totalValue",
        ot.avg_value::float as "avgValue",
        (ot.count::float / NULLIF(tc.total, 0) * 100)::float as percentage
      FROM outcome_totals ot
      CROSS JOIN total_claims tc
      ORDER BY ot.count DESC
    `;

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error fetching outcome financials:', error);
    return NextResponse.json(
      { error: 'Failed to fetch outcome financials' },
      { status: 500 }
    );
  }
}

export const GET = withOrganizationAuth(handler);
