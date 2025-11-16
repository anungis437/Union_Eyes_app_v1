import { NextRequest, NextResponse } from 'next/server';
import { withTenantAuth } from '@/lib/tenant-middleware';
import { withRoleAuth } from '@/lib/role-middleware';
import { getMemberById } from '@/db/queries/organization-members-queries';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: {
    id: string;
  };
}

/**
 * GET /api/members/[id]
 * Get member profile by ID with tenant isolation
 * All authenticated members can view profiles
 */
export const GET = withRoleAuth('member', async (
  request: NextRequest,
  context
) => {
  try {
    const { tenantId } = context;
    const memberId = context.params?.id as string;

    if (!memberId) {
      return NextResponse.json(
        { success: false, error: 'Member ID is required' },
        { status: 400 }
      );
    }

    // Get member from organization_members table
    const member = await getMemberById(tenantId, memberId);

    if (!member) {
      return NextResponse.json(
        { success: false, error: 'Member not found or access denied' },
        { status: 404 }
      );
    }

    // Verify member belongs to current tenant
    if (member.tenantId !== tenantId) {
      return NextResponse.json(
        { success: false, error: 'Access denied - member belongs to different tenant' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: member
    });
  } catch (error) {
    console.error('Error fetching member profile:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
});

/**
 * PATCH /api/members/[id]
 * Update member profile (steward role or higher required)
 */
export const PATCH = withRoleAuth('steward', async (
  request: NextRequest,
  context
) => {
  try {
    const { tenantId } = context;
    const memberId = context.params?.id as string;

    if (!memberId) {
      return NextResponse.json(
        { success: false, error: 'Member ID is required' },
        { status: 400 }
      );
    }

    // Get existing member to verify tenant
    const existingMember = await getMemberById(tenantId, memberId);

    if (!existingMember) {
      return NextResponse.json(
        { success: false, error: 'Member not found or access denied' },
        { status: 404 }
      );
    }

    // Verify member belongs to current tenant
    if (existingMember.tenantId !== tenantId) {
      return NextResponse.json(
        { success: false, error: 'Access denied - member belongs to different tenant' },
        { status: 403 }
      );
    }

    // TODO: Implement updateMember query function and call it here
    // For now, return not implemented
    return NextResponse.json(
      { success: false, error: 'Member update not yet implemented' },
      { status: 501 }
    );
  } catch (error) {
    console.error('Error updating member profile:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
});
