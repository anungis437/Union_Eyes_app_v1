import { NextRequest, NextResponse } from 'next/server';
import { logApiAuditEvent } from '@/lib/middleware/api-security';
import { getMemberById, updateMember as updateMemberRecord } from '@/db/queries/organization-members-queries';
import { db } from '@/db';
import { sql } from 'drizzle-orm';
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

/**
 * Helper function to get user's role and organization context
 */
async function getUserContext(userId: string): Promise<{ role: string; organizationId: string } | null> {
  try {
    const result = await db.execute(
      sql`SELECT role, organization_id FROM tenant_users WHERE user_id = ${userId} LIMIT 1`
    );
    if (result.length > 0) {
      return {
        role: result[0].role as string,
        organizationId: result[0].organization_id as string,
      };
    }
    return null;
  } catch (_error) {
    return null;
  }
}

/**
 * Check if user has sufficient role
 */
function hasMinimumRole(userRole: string, requiredRole: string): boolean {
  const roles = ['member', 'steward', 'executive', 'admin'];
  const userRoleIndex = roles.indexOf(userRole);
  const requiredRoleIndex = roles.indexOf(requiredRole);
  return userRoleIndex >= requiredRoleIndex;
}

/**
 * GET /api/members/[id]
 * Get member profile by ID with tenant isolation
 * All authenticated members can view profiles
 */
export const GET = async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  return withRoleAuth(10, async (request, context) => {
    const { userId, organizationId } = context;

  try {
        const memberId = params.id;

        if (!memberId) {
          logApiAuditEvent({
            timestamp: new Date().toISOString(),
            userId,
            endpoint: `/api/members/${memberId}`,
            method: 'GET',
            eventType: 'validation_failed',
            severity: 'low',
            dataType: 'MEMBER_DATA',
            details: { reason: 'Member ID is required' },
          });
          return NextResponse.json(
            { success: false, error: 'Member ID is required' },
            { status: 400 }
          );
        }

        // Get user context
        const userContext = await getUserContext(userId);
        if (!userContext) {
          logApiAuditEvent({
            timestamp: new Date().toISOString(),
            userId,
            endpoint: `/api/members/${memberId}`,
            method: 'GET',
            eventType: 'auth_failed',
            severity: 'medium',
            details: { reason: 'User context not found' },
          });
          return NextResponse.json(
            { success: false, error: 'User context not found' },
            { status: 403 }
          );
        }

        const { organizationId } = userContext;

        // Get member from organization_members table
        const member = await getMemberById(organizationId, memberId);

        if (!member) {
          logApiAuditEvent({
            timestamp: new Date().toISOString(),
            userId,
            endpoint: `/api/members/${memberId}`,
            method: 'GET',
            eventType: 'validation_failed',
            severity: 'low',
            details: { reason: 'Member not found', memberId },
          });
          return NextResponse.json(
            { success: false, error: 'Member not found or access denied' },
            { status: 404 }
          );
        }

        // Verify member belongs to current organization
        if (member.organizationId !== organizationId) {
          logApiAuditEvent({
            timestamp: new Date().toISOString(),
            userId,
            endpoint: `/api/members/${memberId}`,
            method: 'GET',
            eventType: 'auth_failed',
            severity: 'high',
            details: { reason: 'Cross-organization access attempt', memberId, memberOrg: member.organizationId, userOrg: organizationId },
          });
          return NextResponse.json(
            { success: false, error: 'Access denied - member belongs to different organization' },
            { status: 403 }
          );
        }

        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: `/api/members/${memberId}`,
          method: 'GET',
          eventType: 'success',
          severity: 'low',
          details: { memberId, organizationId },
        });

        return NextResponse.json({
          success: true,
          data: member
        });
      } catch (error) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: `/api/members/${params.id}`,
          method: 'GET',
          eventType: 'server_error',
          severity: 'high',
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
        });
        console.error('Error fetching member profile:', error);
        return NextResponse.json(
          { success: false, error: 'Internal server error' },
          { status: 500 }
        );
      }
      })(request, { params });
};

/**
 * PATCH /api/members/[id]
 * Update member profile (steward role or higher required)
 */
export const PATCH = async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  return withRoleAuth(20, async (request, context) => {
    const { userId, organizationId } = context;

  try {
        const memberId = params.id;

        if (!memberId) {
          logApiAuditEvent({
            timestamp: new Date().toISOString(),
            userId,
            endpoint: `/api/members/${memberId}`,
            method: 'PATCH',
            eventType: 'validation_failed',
            severity: 'low',
            details: { reason: 'Member ID is required' },
          });
          return NextResponse.json(
            { success: false, error: 'Member ID is required' },
            { status: 400 }
          );
        }

        // Get user context
        const userContext = await getUserContext(userId);
        if (!userContext) {
          logApiAuditEvent({
            timestamp: new Date().toISOString(),
            userId,
            endpoint: `/api/members/${memberId}`,
            method: 'PATCH',
            eventType: 'auth_failed',
            severity: 'medium',
            details: { reason: 'User context not found' },
          });
          return NextResponse.json(
            { success: false, error: 'User context not found' },
            { status: 403 }
          );
        }

        const { role, organizationId } = userContext;

        // Check if user has steward role or higher
        if (!hasMinimumRole(role, 'steward')) {
          logApiAuditEvent({
            timestamp: new Date().toISOString(),
            userId,
            endpoint: `/api/members/${memberId}`,
            method: 'PATCH',
            eventType: 'auth_failed',
            severity: 'medium',
            details: { reason: 'Insufficient permissions - steward role required', userRole: role },
          });
          return NextResponse.json(
            { success: false, error: 'Insufficient permissions - steward role or higher required' },
            { status: 403 }
          );
        }

        // Get existing member to verify organization
        const existingMember = await getMemberById(organizationId, memberId);

        if (!existingMember) {
          logApiAuditEvent({
            timestamp: new Date().toISOString(),
            userId,
            endpoint: `/api/members/${memberId}`,
            method: 'PATCH',
            eventType: 'validation_failed',
            severity: 'low',
            details: { reason: 'Member not found', memberId },
          });
          return NextResponse.json(
            { success: false, error: 'Member not found or access denied' },
            { status: 404 }
          );
        }

        // Verify member belongs to current organization
        if (existingMember.organizationId !== organizationId) {
          logApiAuditEvent({
            timestamp: new Date().toISOString(),
            userId,
            endpoint: `/api/members/${memberId}`,
            method: 'PATCH',
            eventType: 'auth_failed',
            severity: 'high',
            details: { reason: 'Cross-organization access attempt', memberId, memberOrg: existingMember.organizationId, userOrg: organizationId },
          });
          return NextResponse.json(
            { success: false, error: 'Access denied - member belongs to different organization' },
            { status: 403 }
          );
        }

        const body = await request.json();
        const updateSchema = z.object({
          name: z.string().min(1).optional(),
          email: z.string().email().optional(),
          phone: z.string().optional(),
          role: z.enum(['member', 'steward', 'officer', 'admin']).optional(),
          status: z.enum(['active', 'inactive', 'on-leave']).optional(),
          department: z.string().optional(),
          position: z.string().optional(),
          membershipNumber: z.string().optional(),
          preferredContactMethod: z.string().optional(),
        });

        const validated = updateSchema.safeParse(body);
        if (!validated.success) {
          return NextResponse.json(
            { success: false, error: 'Validation failed', details: validated.error.errors },
            { status: 400 }
          );
        }

        const updated = await updateMemberRecord(memberId, validated.data);
        if (!updated) {
          return NextResponse.json(
            { success: false, error: 'Member not found or update failed' },
            { status: 404 }
          );
        }

        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: `/api/members/${memberId}`,
          method: 'PATCH',
          eventType: 'success',
          severity: 'low',
          details: { memberId, updatedFields: Object.keys(validated.data) },
        });

        return NextResponse.json({ success: true, data: updated });
      } catch (error) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: `/api/members/${params.id}`,
          method: 'PATCH',
          eventType: 'server_error',
          severity: 'high',
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
        });
        console.error('Error updating member profile:', error);
        return NextResponse.json(
          { success: false, error: 'Internal server error' },
          { status: 500 }
        );
      }
      })(request, { params });
};
