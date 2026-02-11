import { requireUser } from '@/lib/api-auth-guard';
/**
 * API Route: Organization Descendants
 * Get all descendants of an organization (recursive)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, logApiAuditEvent } from '@/lib/middleware/api-security';

import { getOrganizationDescendants } from '@/db/queries/organization-queries';
import { logger } from '@/lib/logger';

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
/**
 * GET /api/organizations/[id]/descendants
 * Get all descendant organizations recursively
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let userId: string | null = null;
  let id = '';
  try {
    const authResult = await requireUser();
    userId = authResult.userId;
    if (!userId) {
      return standardErrorResponse(
      ErrorCode.AUTH_REQUIRED,
      'Unauthorized - Authentication required'
    );
    }

    const resolvedParams = await params;
    id = resolvedParams.id;
    
    const descendants = await getOrganizationDescendants(id);

    return NextResponse.json({
      success: true,
      data: descendants,
      count: descendants.length,
    });
  } catch (error) {
    logger.error('Error fetching organization descendants', error as Error, {
      organizationId: id,
      userId,
      correlationId: request.headers.get('x-correlation-id')
    });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch organization descendants' },
      { status: 500 }
    );
  }
}
