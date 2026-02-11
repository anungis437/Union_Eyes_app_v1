/**
 * Deadline Analytics API
 * 
 * GET /api/analytics/deadlines
 * Returns deadline compliance metrics and trends
 */

import { NextRequest, NextResponse } from 'next/server';
import { withOrganizationAuth } from '@/lib/organization-middleware';
import { getDeadlineAnalytics } from '@/db/queries/analytics-queries';
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
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

    const analytics = await getDeadlineAnalytics(tenantId, { startDate, endDate });

    return NextResponse.json({
      analytics,
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        daysBack,
      },
    });
  } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch deadline analytics',
      error
    );
  }
}

export const GET = withApiAuth(handler);

