import { requireUser } from '@/lib/auth/unified-auth';
/**
 * API Route: Organization Analytics
 * Get analytics and statistics for an organization
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, logApiAuditEvent } from '@/lib/middleware/api-security';

import { logger } from '@/lib/logger';
import { getOrganizationById } from '@/db/queries/organization-queries';
import { getMemberCount, getActiveMemberCount, getMembersByRole } from '@/db/queries/organization-members-queries';

/**
 * GET /api/organizations/[id]/analytics
 * Get comprehensive analytics for an organization
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
    
    const organization = await getOrganizationById(id);
    if (!organization) {
      return NextResponse.json(
        { success: false, error: 'Organization not found' },
        { status: 404 }
      );
    }

    const [memberCount, activeMemberCount, adminMembers, stewardMembers, officerMembers] = await Promise.all([
      getMemberCount(id),
      getActiveMemberCount(id),
      getMembersByRole(id, 'admin'),
      getMembersByRole(id, 'steward'),
      getMembersByRole(id, 'officer'),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        organization: {
          id: organization.id,
          name: organization.name,
          organizationType: organization.organizationType,
          status: organization.status,
          createdAt: organization.createdAt,
        },
        members: {
          total: memberCount,
          active: activeMemberCount,
          admins: adminMembers.length,
          stewards: stewardMembers.length,
          officers: officerMembers.length,
        },
      },
    });
  } catch (error) {
    logger.error('Error fetching organization analytics', error as Error, {
      organizationId: id,
      userId,
      correlationId: request.headers.get('x-correlation-id')
    });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch organization analytics' },
      { status: 500 }
    );
  }
}
