import { NextRequest, NextResponse } from 'next/server';
import { withApiAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { client } from '@/db/db';
import { standardSuccessResponse } from '@/lib/api/standardized-responses';

async function handler(req: NextRequest, context?: any) Record<string, unknown>) {
  try {
    const user = context || await getCurrentUser();
    if (!user || !user.organizationId) {
      return standardErrorResponse(
        ErrorCode.AUTH_REQUIRED,
        'Authentication and organization context required'
      );
    }
    
    const organizationId = user.organizationId;
    const searchParams = req.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '90');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get total costs for percentage calculation
    const totalResult = await client`
      SELECT COALESCE(SUM(c.legal_costs + COALESCE(c.court_costs, 0)), 0) as total
      FROM claims c
      WHERE c.organization_id = ${organizationId}
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
        WHERE c.organization_id = ${organizationId}
          AND c.filed_date >= ${startDate.toISOString()}
        
        UNION ALL
        
        SELECT
          'Court Costs' as category,
          COALESCE(SUM(c.court_costs), 0) as amount
        FROM claims c
        WHERE c.organization_id = ${organizationId}
          AND c.filed_date >= ${startDate.toISOString()}
        
        UNION ALL
        
        SELECT
          'Administrative' as category,
          COALESCE(SUM(c.legal_costs), 0) * 0.15 as amount
        FROM claims c
        WHERE c.organization_id = ${organizationId}
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

    return standardSuccessResponse(result);

  } catch (error) {
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch cost breakdown'
    );
  }
}

export const GET = withApiAuth(handler);

