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

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get total costs for percentage calculation
    const totalResult = await client`
      SELECT COALESCE(SUM(c.legal_costs + COALESCE(c.court_costs, 0)), 0) as total
      FROM claims c
      WHERE c.tenant_id = ${tenantId}
        AND c.filed_date >= ${startDate.toISOString()}
    `;

    const totalCosts = parseFloat(totalResult[0].total) || 1; // Avoid division by zero

    // Get cost breakdown
    const result = await client`
      WITH cost_breakdown AS (
        SELECT
          'Legal Fees' as category,
          COALESCE(SUM(c.legal_costs), 0) as amount
        FROM claims c
        WHERE c.tenant_id = ${tenantId}
          AND c.filed_date >= ${startDate.toISOString()}
        
        UNION ALL
        
        SELECT
          'Court Costs' as category,
          COALESCE(SUM(c.court_costs), 0) as amount
        FROM claims c
        WHERE c.tenant_id = ${tenantId}
          AND c.filed_date >= ${startDate.toISOString()}
        
        UNION ALL
        
        SELECT
          'Administrative' as category,
          COALESCE(SUM(c.legal_costs), 0) * 0.15 as amount
        FROM claims c
        WHERE c.tenant_id = ${tenantId}
          AND c.filed_date >= ${startDate.toISOString()}
      )
      SELECT
        category,
        amount::float,
        (amount / ${totalCosts} * 100)::float as percentage
      FROM cost_breakdown
      WHERE amount > 0
      ORDER BY amount DESC
    `;

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error fetching cost breakdown:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cost breakdown' },
      { status: 500 }
    );
  }
}

export const GET = withApiAuth(handler);
