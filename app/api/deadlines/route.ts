/**
 * Deadlines API Routes
 * 
 * Endpoints:
 * - GET /api/deadlines - List all deadlines (filtered)
 * - GET /api/deadlines/upcoming - Upcoming deadlines
 * - GET /api/deadlines/overdue - Overdue deadlines
 * - GET /api/deadlines/dashboard - Dashboard summary
 * - POST /api/deadlines/[id]/complete - Mark complete
 * - POST /api/deadlines/[id]/extend - Request extension
 */

import { NextRequest, NextResponse } from 'next/server';
import { withOrganizationAuth } from '@/lib/organization-middleware';
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
import {
  getClaimDeadlines,
  getCriticalDeadlines,
  getOverdueDeadlines,
  getMemberDeadlines,
  getDeadlineDashboardSummary,
} from '@/db/queries/deadline-queries';
import {
  initializeClaimDeadlines,
  markDeadlineComplete,
  requestExtension,
  getMemberUpcomingDeadlines,
  getDashboardSummary,
} from '@/lib/deadline-service';

/**
 * GET /api/deadlines
 * List deadlines with filters
 */
export const GET = withApiAuth(async (request: NextRequest, context: any) => {
  const { organizationId, userId } = context;
  const { searchParams } = new URL(request.url);
  
  const claimId = searchParams.get('claimId');
  const status = searchParams.get('status') as any;
  const daysAhead = searchParams.get('daysAhead');
  
  try {
    let deadlines;
    
    if (claimId) {
      // Get deadlines for specific claim
      deadlines = await getClaimDeadlines(claimId);
    } else {
      // Get member's deadlines
      deadlines = await getMemberDeadlines(userId, tenantId, {
        status,
        daysAhead: daysAhead ? parseInt(daysAhead) : undefined,
      });
    }
    
    return NextResponse.json({ deadlines });
  } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch deadlines',
      error
    );
  }
});

