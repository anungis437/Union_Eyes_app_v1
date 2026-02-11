/**
 * Category Breakdown Analytics API
 * 
 * GET /api/analytics/claims/categories
 * Returns claims grouped by category with trend comparison
 */

import { withRLSContext } from '@/lib/db/with-rls-context';
import { NextRequest, NextResponse } from 'next/server';
import { withOrganizationAuth } from '@/lib/organization-middleware';
import { sql, db } from '@/db';
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
interface CategoryBreakdown {
  category: string;
  count: number;
  percentage: number;
  change: number;
}

async function handler(req: NextRequest, context) {
  try {
    const organizationId = context.organizationId;
    const tenantId = organizationId;
    
    if (!tenantId) {
      return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Tenant ID required'
    );
    }

    const url = new URL(req.url);
    const daysBack = parseInt(url.searchParams.get('days') || '30');
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    // Get current period categories
    const currentCategories = await withRLSContext(async (tx) => {
      return await tx.execute(sql`
      SELECT 
        claim_type AS category,
        COUNT(*) AS count
      FROM claims
      WHERE tenant_id = ${tenantId}
        AND created_at BETWEEN ${startDate} AND ${endDate}
      GROUP BY claim_type
      ORDER BY COUNT(*) DESC
    `) as any[];
    });

    const totalCurrent = currentCategories.reduce((sum, cat) => sum + parseInt(cat.count), 0);

    // Get previous period for comparison
    const prevStartDate = new Date(startDate);
    prevStartDate.setDate(prevStartDate.getDate() - daysBack);
    const prevEndDate = startDate;

    const previousCategories = await withRLSContext(async (tx) => {
      return await tx.execute(sql`
      SELECT 
        claim_type AS category,
        COUNT(*) AS count
      FROM claims
      WHERE tenant_id = ${tenantId}
        AND created_at BETWEEN ${prevStartDate} AND ${prevEndDate}
      GROUP BY claim_type
    `) as any[];
    });

    const prevCategoryMap = new Map(
      previousCategories.map(cat => [cat.category, parseInt(cat.count)])
    );

    // Calculate breakdown with change percentages
    const breakdown: CategoryBreakdown[] = currentCategories.map(cat => {
      const currentCount = parseInt(cat.count);
      const previousCount = prevCategoryMap.get(cat.category) || 0;
      
      const change = previousCount > 0
        ? Math.round(((currentCount - previousCount) / previousCount) * 100)
        : 0;

      return {
        category: cat.category,
        count: currentCount,
        percentage: totalCurrent > 0 ? (currentCount / totalCurrent) * 100 : 0,
        change,
      };
    });

    return NextResponse.json(breakdown);
  } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch category breakdown',
      error
    );
  }
}

export const GET = withApiAuth(handler);

