/**
 * API Route: Search Members
 * Full-text search for members with filters
 */

import { NextRequest, NextResponse } from 'next/server';
import { withApiAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { searchMembers } from '@/db/queries/organization-members-queries';

export const dynamic = 'force-dynamic';

export const GET = withApiAuth(async (request: NextRequest) => {
  try {
    const user = await getCurrentUser();
    if (!user || !user.tenantId) {
      return NextResponse.json(
        { error: 'Authentication and tenant context required' },
        { status: 401 }
      );
    }
    
    const tenantId = user.tenantId;
    const searchParams = request.nextUrl.searchParams;

    // Get search query and filters
    const query = searchParams.get('q') || '';
    const role = searchParams.get('role') as "member" | "steward" | "officer" | "admin" | null;
    const status = searchParams.get('status') as "active" | "inactive" | "on-leave" | null;
    const department = searchParams.get('department');

    // Build filters object
    const filters: any = {};
    if (role) filters.role = role;
    if (status) filters.status = status;
    if (department) filters.department = department;

    // Search members
    const members = await searchMembers(tenantId, query, Object.keys(filters).length > 0 ? filters : undefined);

    return NextResponse.json({
      success: true,
      data: {
        members,
        query,
        filters,
        count: members.length,
      },
    });
  } catch (error) {
    console.error('Error searching members:', error);
    return NextResponse.json(
      { error: 'Failed to search members' },
      { status: 500 }
    );
  }
});
