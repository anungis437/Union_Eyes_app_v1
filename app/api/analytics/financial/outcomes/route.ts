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
      WITH outcome_totals AS (
        SELECT
          COALESCE(c.resolution_outcome, 'pending') as outcome,
          COUNT(*) as count,
          COALESCE(SUM(c.claim_amount), 0) as total_value,
          COALESCE(AVG(c.claim_amount), 0) as avg_value
        FROM claims c
        WHERE c.organization_id = ${organizationId}
          AND c.filed_date >= ${startDate.toISOString()}
        GROUP BY c.resolution_outcome
      ),
      total_claims AS (
        SELECT COUNT(*) as total
        FROM claims
        WHERE organization_id = ${organizationId}
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
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch outcome financials',
      error
    );
  }
}

export const GET = withOrganizationAuth(handler);

