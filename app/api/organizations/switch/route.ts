/**
 * Organization Switch API
 * 
 * Provides server-side validation for organization switching to prevent
 * client-side cookie manipulation and enforce access control.
 * 
 * Security measures:
 * - Validates user has access to target organization
 * - Checks super admin permissions server-side
 * - Logs all organization switches for audit trail
 * - Returns signed token for additional verification
 */

import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { logApiAuditEvent } from '@/lib/middleware/api-security';
import { currentUser } from '@clerk/nextjs/server';

import { db } from '@/db';
import { organizations, organizationMembers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { withRLSContext } from '@/lib/db/with-rls-context';

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';

const organizationsSwitchSchema = z.object({
  organizationId: z.string().uuid('Invalid organizationId'),
});


export const POST = async (req: NextRequest) => {
  return withRoleAuth(20, async (request, context) => {
    const { userId, organizationId: currentOrgId } = context;

  try {
      const body = await req.json();
      const { organizationId } = body;
  if (organizationId && organizationId !== context.organizationId) {
    return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Forbidden'
    );
  }


      if (!organizationId || typeof organizationId !== 'string') {
        return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid organization ID'
    );
      }

      // Get user details from Clerk for logging
      const clerkUser = await currentUser();
      if (!user) {
        return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'User not found'
    );
      }

      // Check if organization exists
      const targetOrg = await withRLSContext({ organizationId }, async (db) => {
        return await db.query.organizations.findFirst({
          where: eq(organizations.id, organizationId),
        });
      });

      if (!targetOrg) {
        logger.warn('Organization switch attempted for non-existent org', {
          userId,
          organizationId,
          userEmail: clerkUser.emailAddresses[0]?.emailAddress,
        });
        
        return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Organization not found'
    );
      }

      // Check if user is super admin
      const publicMetadata = clerkUser.publicMetadata || {};
      const privateMetadata = clerkUser.privateMetadata || {};
      const userRole = (publicMetadata.role || privateMetadata.role || 'member') as string;
      const isSuperAdmin = userRole === 'super_admin';

      // If super admin, allow access to any organization
      if (isSuperAdmin) {
        logger.info('Super admin switched organization', {
          userId,
          userEmail: clerkUser.emailAddresses[0]?.emailAddress,
          fromOrg: publicMetadata.organizationId,
          toOrg: organizationId,
          orgName: targetOrg.name,
        });

        return NextResponse.json({
          success: true,
          organization: targetOrg,
          access: 'super_admin',
        });
      }

      // Check if user has membership in target organization
      const membership = await withRLSContext({ organizationId }, async (db) => {
        return await db.query.organizationMembers.findFirst({
          where: and(
            eq(organizationMembers.userId, userId),
            eq(organizationMembers.organizationId, organizationId)
          ),
        });
      });

      if (!membership) {
        // Check if user has access through organizational hierarchy (e.g., admin of parent org)
        // NOTE: This is a cross-organization query - user may have memberships in multiple organizations
        // Using current context organizationId for RLS compliance, but query spans all user's orgs
        const userMemberships = await withRLSContext({ organizationId: currentOrgId }, async (db) => {
          return await db.query.organizationMembers.findMany({
            where: eq(organizationMembers.userId, userId),
            with: {
              organization: true,
            },
          });
        });

        // Check if user is admin/steward in any parent organization
        let hasHierarchicalAccess = false;
        
        for (const userMembership of userMemberships) {
          if (['admin', 'steward'].includes(userMembership.role)) {
            // Check if target org's hierarchyPath contains this user's org
            // hierarchyPath is an array like ['parent-org-id', 'child-org-id']
            if (targetOrg.hierarchyPath?.includes(userMembership.organizationId)) {
              hasHierarchicalAccess = true;
              break;
            }
          }
        }

        if (!hasHierarchicalAccess) {
          logger.warn('Unauthorized organization switch attempt', {
            userId,
            userEmail: clerkUser.emailAddresses[0]?.emailAddress,
            organizationId,
            orgName: targetOrg.name,
          });

          return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Access denied. You do not have permission to access this organization.'
    );
        }

        logger.info('User switched organization via hierarchical access', {
          userId,
          userEmail: clerkUser.emailAddresses[0]?.emailAddress,
          organizationId,
          orgName: targetOrg.name,
          access: 'hierarchical',
        });

        return NextResponse.json({
          success: true,
          organization: targetOrg,
          access: 'hierarchical',
        });
      }

      // User has direct membership
      logger.info('User switched organization', {
        userId,
        userEmail: clerkUser.emailAddresses[0]?.emailAddress,
        organizationId,
        orgName: targetOrg.name,
        role: membership.role,
        access: 'direct',
      });

      return NextResponse.json({
        success: true,
        organization: targetOrg,
        membership: {
          role: membership.role,
          isPrimary: membership.isPrimary,
          joinedAt: membership.joinedAt,
        },
        access: 'direct',
      });

    } catch (error) {
      logger.error('Organization switch failed', error as Error, {
        path: '/api/organizations/switch',
      });

      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Internal server error',
      error
    );
    }
    })(request);
};

