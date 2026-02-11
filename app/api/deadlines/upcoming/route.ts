/**
 * GET /api/deadlines/upcoming
 * Get upcoming deadlines (next 7 days)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCriticalDeadlines } from '@/db/queries/deadline-queries';
import { withApiAuth } from '@/lib/api-auth-guard';

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
export const GET = withApiAuth(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const organizationId = (searchParams.get('organizationId') ?? searchParams.get('tenantId'));
  const tenantId = organizationId;
  
  if (!tenantId) {
    return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Tenant ID required'
    );
  }
  
  try {
    const deadlines = await getCriticalDeadlines(tenantId);
    return NextResponse.json({ deadlines });
  } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch deadlines',
      error
    );
  }
});

