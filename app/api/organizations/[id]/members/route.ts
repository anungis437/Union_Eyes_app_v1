/**
 * API Route: Organization Members
 * Get and manage members of an organization
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  getOrganizationMembers,
  // TODO: Implement addOrganizationMember function for adding existing users to organizations
  // addOrganizationMember,
} from '@/db/queries/organization-members-queries';
import { logger } from '@/lib/logger';

/**
 * GET /api/organizations/[id]/members
 * Get all members of an organization
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let userId: string | null = null;
  let id = '';
  try {
    const authResult = await auth();
    userId = authResult.userId;
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    id = resolvedParams.id;
    
    const members = await getOrganizationMembers(id);

    return NextResponse.json({
      success: true,
      data: members,
      count: members.length,
    });
  } catch (error) {
    logger.error('Error fetching organization members', error as Error, {
      organizationId: id,
      userId,
      correlationId: request.headers.get('x-correlation-id')
    });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch organization members' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/organizations/[id]/members
 * Add a member to an organization
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let userId: string | null = null;
  let organizationId = '';
  try {
    const authResult = await auth();
    userId = authResult.userId;
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    organizationId = resolvedParams.id;
    const body = await request.json();

    // Validate required fields
    const { memberId, role } = body;
    if (!memberId || !role) {
      return NextResponse.json(
        { error: 'Member ID and role are required' },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ['member', 'steward', 'officer', 'admin'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${validRoles.join(', ')}` },
        { status: 400 }
      );
    }

    // TODO: Implement addOrganizationMember function
    // const result = await addOrganizationMember(
    //   organizationId,
    //   memberId,
    //   role,
    //   body.isPrimary || false
    // );

    return NextResponse.json({
      success: false,
      error: 'Adding members to organizations not yet implemented',
    }, { status: 501 });
  } catch (error: any) {
    logger.error('Error adding member to organization', error as Error, {
      organizationId,
      userId,
      correlationId: request.headers.get('x-correlation-id')
    });

    // Handle unique constraint violations (member already in org)
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Member is already part of this organization' },
        { status: 409 }
      );
    }

    // Handle foreign key violations
    if (error.code === '23503') {
      return NextResponse.json(
        { error: 'Invalid organization or member ID' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to add member to organization' },
      { status: 500 }
    );
  }
}
