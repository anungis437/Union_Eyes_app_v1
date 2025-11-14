/**
 * API Route: Organization Members
 * Fetch members for the current user's organization
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { 
  getOrganizationMembers, 
  getMemberCount, 
  getActiveMemberCount 
} from '@/db/queries/organization-members-queries';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use orgId from Clerk, fallback to query param
    const searchParams = request.nextUrl.searchParams;
    const organizationId = orgId || searchParams.get('organizationId') || 'default-org';

    // Fetch members
    const members = await getOrganizationMembers(organizationId);
    const totalCount = await getMemberCount(organizationId);
    const activeCount = await getActiveMemberCount(organizationId);

    return NextResponse.json({
      success: true,
      data: {
        members,
        stats: {
          total: totalCount,
          active: activeCount,
          inactive: totalCount - activeCount,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching organization members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch members' },
      { status: 500 }
    );
  }
}
