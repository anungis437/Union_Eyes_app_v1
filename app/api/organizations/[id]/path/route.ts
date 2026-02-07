import { requireUser } from '@/lib/auth/unified-auth';
/**
 * API Route: Organization Path
 * Get the hierarchical path from root to an organization
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, logApiAuditEvent } from '@/lib/middleware/api-security';

import { getOrganizationAncestors as getOrganizationPath } from '@/db/queries/organization-queries';
import { logger } from '@/lib/logger';

/**
 * GET /api/organizations/[id]/path
 * Get the path from root to this organization
 * Example: [CLC, CUPE, CUPE Local 123]
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
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    id = resolvedParams.id;
    
    const path = await getOrganizationPath(id);

    return NextResponse.json({
      success: true,
      data: path,
      count: path.length,
    });
  } catch (error) {
    logger.error('Error fetching organization path', error as Error, {
      organizationId: id,
      userId,
      correlationId: request.headers.get('x-correlation-id')
    });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch organization path' },
      { status: 500 }
    );
  }
}
