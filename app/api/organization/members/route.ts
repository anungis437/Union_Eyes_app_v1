/**
 * API Route: Organization Members
 * Fetch members for the current user's tenant
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';
import { logApiAuditEvent } from '@/lib/middleware/api-security';
import { 
  getOrganizationMembers, 
  getMemberCount, 
  getActiveMemberCount,
  createMember
} from '@/db/queries/organization-members-queries';
import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';

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

    return standardSuccessResponse({
      members,
      stats: {
        total: totalCount,
        active: activeCount,
        inactive: totalCount - activeCount,
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
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch members',
      error
    );
  }
});

const createMemberSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  membershipNumber: z.string().min(1, 'Membership number is required'),
  phone: z.string().nullable().optional(),
  role: z.string().optional(),
  status: z.string().optional(),
  department: z.string().nullable().optional(),
  position: z.string().nullable().optional(),
  hireDate: z.string().nullable().optional(),
  unionJoinDate: z.string().nullable().optional(),
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

    // Validate request body
    const validation = createMemberSchema.safeParse(body);
    if (!validation.success) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: '/api/organization/members',
        method: 'POST',
        eventType: 'validation_failed',
        severity: 'low',
        dataType: 'MEMBER_DATA',
        details: { reason: validation.error.message, organizationId },
      });
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        validation.error.errors[0]?.message || 'Invalid request data'
      );
    }

    const { name, email, membershipNumber } = validation.data;

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

    return standardSuccessResponse(
      newMember,
      'Member created successfully',
      201
    );
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
    // Handle unique constraint violations
    if ((error as any).code === '23505') {
      return standardErrorResponse(
        ErrorCode.RESOURCE_ALREADY_EXISTS,
        'A member with this email or membership number already exists'
      );
    }

    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to create member',
      error
    );
  }
});

