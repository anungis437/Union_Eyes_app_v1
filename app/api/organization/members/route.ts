/**
 * API Route: Organization Members
 * Fetch members for the current user's tenant
 */

import { NextRequest, NextResponse } from 'next/server';
import { withEnhancedRoleAuth } from '@/lib/enterprise-role-middleware';
import { logApiAuditEvent } from '@/lib/middleware/api-security';
import { 
  getOrganizationMembers, 
  getMemberCount, 
  getActiveMemberCount,
  createMember
} from '@/db/queries/organization-members-queries';

export const dynamic = 'force-dynamic';

// GET requires at least role level 20
export const GET = withEnhancedRoleAuth(20, async (request, context) => {
  const { userId, organizationId } = context;

  try {
    // Fetch members for the current tenant
    const members = await getOrganizationMembers(organizationId);
    const totalCount = await getMemberCount(organizationId);
    const activeCount = await getActiveMemberCount(organizationId);

    logApiAuditEvent({
      timestamp: new Date().toISOString(),
      userId,
      endpoint: '/api/organization/members',
      method: 'GET',
      eventType: 'success',
      severity: 'low',
      dataType: 'MEMBER_DATA',
      details: { organizationId, memberCount: members.length },
    });

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
    logApiAuditEvent({
      timestamp: new Date().toISOString(),
      userId,
      endpoint: '/api/organization/members',
      method: 'GET',
      eventType: 'server_error',
      severity: 'high',
      dataType: 'MEMBER_DATA',
      details: { error: error instanceof Error ? error.message : 'Unknown error', organizationId },
    });
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
 * Requires role level 40 (steward or higher)
 */
export const POST = withEnhancedRoleAuth(40, async (request, context) => {
  const { userId, organizationId } = context;

  try {
    const body = await request.json();

    // Validate required fields
    const { name, email, membershipNumber } = body;
    if (!name || !email || !membershipNumber) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: '/api/organization/members',
        method: 'POST',
        eventType: 'validation_failed',
        severity: 'low',
        dataType: 'MEMBER_DATA',
        details: { reason: 'Name, email, and membership number are required', organizationId },
      });
      return NextResponse.json(
        { success: false, error: 'Name, email, and membership number are required' },
        { status: 400 }
      );
    }

    // Create member with organization ID
    const newMember = await createMember({
      organizationId: organizationId,
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
    });

    logApiAuditEvent({
      timestamp: new Date().toISOString(),
      userId,
      endpoint: '/api/organization/members',
      method: 'POST',
      eventType: 'success',
      severity: 'medium',
      dataType: 'MEMBER_DATA',
      details: { organizationId, memberEmail: email, membershipNumber },
    });

    return NextResponse.json({
      success: true,
      data: newMember,
      message: 'Member created successfully'
    }, { status: 201 });
  } catch (error: any) {
    logApiAuditEvent({
      timestamp: new Date().toISOString(),
      userId,
      endpoint: '/api/organization/members',
      method: 'POST',
      eventType: 'server_error',
      severity: 'high',
      dataType: 'MEMBER_DATA',
      details: { error: error instanceof Error ? error.message : 'Unknown error', organizationId },
    });
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
