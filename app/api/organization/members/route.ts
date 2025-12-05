/**
 * API Route: Organization Members
 * Fetch members for the current user's tenant
 */

import { NextRequest, NextResponse } from 'next/server';
import { withTenantAuth } from '@/lib/tenant-middleware';
import { withRoleAuth } from '@/lib/role-middleware';
import { 
  getOrganizationMembers, 
  getMemberCount, 
  getActiveMemberCount,
  createMember
} from '@/db/queries/organization-members-queries';

export const dynamic = 'force-dynamic';

// GET requires at least member role (all members can view directory)
export const GET = withRoleAuth('member', async (request: NextRequest, context) => {
  try {
    const { organizationId } = context;

    // Fetch members for the current tenant
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
      { success: false, error: 'Failed to fetch members' },
      { status: 500 }
    );
  }
});

/**
 * POST /api/organization/members
 * Create a new member for the current tenant
 * Requires steward role or higher (stewards, officers, admins can add members)
 */
export const POST = withRoleAuth('steward', async (request: NextRequest, context) => {
  try {
    const { organizationId } = context;
    const body = await request.json();

    // Validate required fields
    const { name, email, membershipNumber } = body;
    if (!name || !email || !membershipNumber) {
      return NextResponse.json(
        { success: false, error: 'Name, email, and membership number are required' },
        { status: 400 }
      );
    }

    // Create member with tenant ID
    const newMember = await createMember({
      tenantId: organizationId,
      userId: `user_${Date.now()}`, // Generate temporary user ID
      name,
      email,
      phone: body.phone || null,
      role: body.role || 'member',
      status: body.status || 'active',
      department: body.department || null,
      position: body.position || null,
      hireDate: body.hireDate ? new Date(body.hireDate) : null,
      seniority: "0", // Will be calculated based on hire date
      membershipNumber,
      unionJoinDate: body.unionJoinDate ? new Date(body.unionJoinDate) : new Date(),
      metadata: "{}", // Legacy field, keep for backward compatibility
      organizationId: 'legacy', // Legacy field, keep for backward compatibility
    });

    return NextResponse.json({
      success: true,
      data: newMember,
      message: 'Member created successfully'
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating member:', error);
    
    // Handle unique constraint violations
    if (error.code === '23505') {
      return NextResponse.json(
        { success: false, error: 'A member with this email or membership number already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create member' },
      { status: 500 }
    );
  }
});
