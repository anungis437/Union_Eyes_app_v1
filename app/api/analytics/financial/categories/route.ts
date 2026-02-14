import { NextRequest, NextResponse } from 'next/server';
import { withOrganizationAuth } from '@/lib/organization-middleware';
import { client } from '@/db/db';
import { withApiAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';

import { standardSuccessResponse } from '@/lib/api/standardized-responses';
async function handler(req: NextRequest, context) {
  try {
    const organizationId = context.organizationId;
    
    if (!organizationId) {
      return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Organization ID required'
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
      WHERE c.organization_id = ${organizationId}
        AND c.filed_date >= ${startDate.toISOString()}
      GROUP BY c.claim_type
      ORDER BY "totalValue" DESC
    `;

    return NextResponse.json(result);

  } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch category financials',
      error
    );
  }
}

export const GET = withOrganizationAuth(handler);

