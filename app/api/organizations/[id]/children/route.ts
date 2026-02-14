import { requireUser } from '@/lib/api-auth-guard';
/**
 * API Route: Organization Children
 * Get direct children of an organization
 */

import { NextRequest, NextResponse } from 'next/server';
import { logApiAuditEvent } from '@/lib/middleware/api-security';

import { getOrganizationChildren } from '@/db/queries/organization-queries';
import { logger } from '@/lib/logger';

import { standardSuccessResponse } from '@/lib/api/standardized-responses';
/**
 * GET /api/organizations/[id]/children
 * Get direct child organizations
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
    
    const children = await getOrganizationChildren(id);

    return NextResponse.json({
      success: true,
      data: children,
      count: children.length,
    });
  } catch (error) {
    logger.error('Error fetching organization children', error as Error, {
      organizationId: id,
      userId,
      correlationId: request.headers.get('x-correlation-id')
    });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch organization children' },
      { status: 500 }
    );
  }
}
