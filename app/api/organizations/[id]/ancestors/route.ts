import { requireUser } from '@/lib/api-auth-guard';
/**
 * API Route: Organization Ancestors
 * Get all ancestors of an organization up to the root
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, logApiAuditEvent } from '@/lib/middleware/api-security';

import { getOrganizationAncestors } from '@/db/queries/organization-queries';
import { logger } from '@/lib/logger';

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
/**
 * GET /api/organizations/[id]/ancestors
 * Get all ancestor organizations up to the root
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
    
    const ancestors = await getOrganizationAncestors(id);

    return NextResponse.json({
      success: true,
      data: ancestors,
      count: ancestors.length,
    });
  } catch (error) {
    logger.error('Error fetching organization ancestors', error as Error, {
      organizationId: id,
      userId,
      correlationId: request.headers.get('x-correlation-id')
    });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch organization ancestors' },
      { status: 500 }
    );
  }
}
