import { NextRequest, NextResponse } from 'next/server';
import { withRoleAuth } from '@/lib/role-middleware';
import { getMemberById } from '@/db/queries/organization-members-queries';

export const dynamic = 'force-dynamic';

/**
 * GET /api/members/[id]
 * Get member profile by ID with tenant isolation
 * All authenticated members can view profiles
 */
export const GET = withRoleAuth('member', async (
  request: NextRequest,
  context,
  params?: { id: string }
) => {
  try {
    const { organizationId } = context;
    const memberId = params?.id as string;

    if (!memberId) {
      return NextResponse.json(
        { success: false, error: 'Member ID is required' },
        { status: 400 }
      );
    }

    // Get member from organization_members table
    const member = await getMemberById(organizationId, memberId);

    if (!member) {
      return NextResponse.json(
        { success: false, error: 'Member not found or access denied' },
        { status: 404 }
      );
    }

    // Verify member belongs to current organization
    if (member.organizationId !== organizationId) {
      return NextResponse.json(
        { success: false, error: 'Access denied - member belongs to different organization' },
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
  context,
  params?: { id: string }
) => {
  try {
    const { organizationId } = context;
    const memberId = params?.id as string;

    if (!memberId) {
      return NextResponse.json(
        { success: false, error: 'Member ID is required' },
        { status: 400 }
      );
    }

    // Get existing member to verify organization
    const existingMember = await getMemberById(organizationId, memberId);

    if (!existingMember) {
      return NextResponse.json(
        { success: false, error: 'Member not found or access denied' },
        { status: 404 }
      );
    }

    // Verify member belongs to current organization
    if (existingMember.organizationId !== organizationId) {
      return NextResponse.json(
        { success: false, error: 'Access denied - member belongs to different organization' },
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
