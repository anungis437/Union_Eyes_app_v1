import { withRLSContext } from '@/lib/db/with-rls-context';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { organizationMembers } from '@/db/schema-organizations';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { logApiAuditEvent } from '@/lib/middleware/api-security';
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
const DEFAULT_ORG_ID = '458a56cb-251a-4c91-a0b5-81bb8ac39087';

/**
 * Validation schemas
 */
const updateRoleSchema = z.object({
  userId: z.string().uuid().describe('User ID to update'),
  role: z.enum(['super_admin', 'admin', 'officer', 'member']),
  organizationId: z.string().uuid().optional(),
});

/**
 * Helper to check admin role
 */
async function checkAdminRole(userId: string): Promise<boolean> {
  try {
    const member = await withRLSContext(async (tx) => {
      return await tx.query({
      where: (om, { eq: eqOp }) => eqOp(om.userId, userId),
    });
    });
    return member ? ['admin', 'super_admin'].includes(member.role) : false;
  } catch (_error) {
    return false;
  }
}

/**
 * PATCH /api/admin/update-role
 * Update a user's role in an organization (admin only)
 */
export const PATCH = withRoleAuth(90, async (request, context) => {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid JSON in request body',
      error
    );
  }

  const parsed = updateRoleSchema.safeParse(rawBody);
  if (!parsed.success) {
    return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid request body',
      error
    );
  }

  const body = parsed.data;
  const { userId, organizationId } = context;

  const orgId = (body as Record<string, unknown>)["organizationId"] ?? (body as Record<string, unknown>)["orgId"] ?? (body as Record<string, unknown>)["organization_id"] ?? (body as Record<string, unknown>)["org_id"] ?? (body as Record<string, unknown>)["unionId"] ?? (body as Record<string, unknown>)["union_id"] ?? (body as Record<string, unknown>)["localId"] ?? (body as Record<string, unknown>)["local_id"];
  if (typeof orgId === 'string' && orgId.length > 0 && orgId !== organizationId) {
    return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Forbidden',
      error
    );
  }

try {
      const { userId: targetUserId, role, organizationId = DEFAULT_ORG_ID } = body;

      // Check if calling user is admin
      const isAdmin = await checkAdminRole(userId);
      if (!isAdmin) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(), userId,
          endpoint: '/api/admin/update-role',
          method: 'PATCH',
          eventType: 'unauthorized_access',
          severity: 'high',
          details: { reason: 'Non-admin attempted role update', targetUserId },
        });
        return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Forbidden - Admin role required'
    );
      }

      // Prevent self-demotion (unless going from super_admin to admin)
      if (userId === targetUserId && role !== 'super_admin') {
        logApiAuditEvent({
          timestamp: new Date().toISOString(), userId,
          endpoint: '/api/admin/update-role',
          method: 'PATCH',
          eventType: 'validation_failed',
          severity: 'medium',
          details: { reason: 'Admin attempted self-demotion', targetRole: role },
        });
        return NextResponse.json(
          { error: 'Cannot demote yourself' },
          { status: 400 }
        );
      }

      // Update role
      const result = await db
        .update(organizationMembers)
        .set({
          role,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(organizationMembers.userId, targetUserId),
            eq(organizationMembers.organizationId, organizationId)
          )
        )
        .returning();

      if (!result.length) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(), userId,
          endpoint: '/api/admin/update-role',
          method: 'PATCH',
          eventType: 'validation_failed',
          severity: 'medium',
          details: { reason: 'User not found in organization', targetUserId, organizationId },
        });
        return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'User not found in specified organization'
    );
      }

      logApiAuditEvent({
        timestamp: new Date().toISOString(), userId,
        endpoint: '/api/admin/update-role',
        method: 'PATCH',
        eventType: 'success',
        severity: 'high',
        details: { targetUserId, newRole: role, organizationId },
      });

      return NextResponse.json({
        success: true,
        updated: result[0] || null,
      });
    } catch (error) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(), userId,
        endpoint: '/api/admin/update-role',
        method: 'PATCH',
        eventType: 'auth_failed',
        severity: 'high',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      });

      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
});


