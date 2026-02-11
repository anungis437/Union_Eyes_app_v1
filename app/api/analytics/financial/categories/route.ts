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
      SELECT
        COALESCE(c.claim_type, 'Other') as category,
        COALESCE(SUM(c.claim_amount), 0)::float as "totalValue",
        COALESCE(AVG(c.claim_amount), 0)::float as "avgValue",
        COALESCE(SUM(CASE WHEN c.resolution_outcome = 'won' THEN c.settlement_amount ELSE 0 END), 0)::float as settlements,
        COALESCE(SUM(c.legal_costs + COALESCE(c.court_costs, 0)), 0)::float as costs,
        CASE 
          WHEN SUM(c.legal_costs + COALESCE(c.court_costs, 0)) > 0 
          THEN ((SUM(CASE WHEN c.resolution_outcome = 'won' THEN c.settlement_amount ELSE 0 END) - 
                 SUM(c.legal_costs + COALESCE(c.court_costs, 0))) / 
                SUM(c.legal_costs + COALESCE(c.court_costs, 0)) * 100)
          ELSE 0
        END::float as roi
      FROM claims c
      WHERE c.tenant_id = ${tenantId}
        AND c.filed_date >= ${startDate.toISOString()}
      GROUP BY c.claim_type
      ORDER BY "totalValue" DESC
    `;

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error fetching category financials:', error);
    return NextResponse.json(
      { error: 'Failed to fetch category financials' },
      { status: 500 }
    );
  }
}

export const GET = withOrganizationAuth(handler);

