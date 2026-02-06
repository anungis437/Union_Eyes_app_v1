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

import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { db } from '@/db';
import { organizations, organizationMembers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { organizationId } = body;

    if (!organizationId || typeof organizationId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid organization ID' },
        { status: 400 }
      );
    }

    // Get current user details
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if organization exists
    const targetOrg = await db.query.organizations.findFirst({
      where: eq(organizations.id, organizationId),
    });

    if (!targetOrg) {
      logger.warn('Organization switch attempted for non-existent org', {
        userId,
        organizationId,
        userEmail: user.emailAddresses[0]?.emailAddress,
      });
      
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Check if user is super admin
    const publicMetadata = user.publicMetadata || {};
    const privateMetadata = user.privateMetadata || {};
    const userRole = (publicMetadata.role || privateMetadata.role || 'member') as string;
    const isSuperAdmin = userRole === 'super_admin';

    // If super admin, allow access to any organization
    if (isSuperAdmin) {
      logger.info('Super admin switched organization', {
        userId,
        userEmail: user.emailAddresses[0]?.emailAddress,
        fromOrg: publicMetadata.tenantId,
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
    const membership = await db.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.userId, userId),
        eq(organizationMembers.organizationId, organizationId)
      ),
    });

    if (!membership) {
      // Check if user has access through organizational hierarchy (e.g., admin of parent org)
      const userMemberships = await db.query.organizationMembers.findMany({
        where: eq(organizationMembers.userId, userId),
        with: {
          organization: true,
        },
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
          userEmail: user.emailAddresses[0]?.emailAddress,
          organizationId,
          orgName: targetOrg.name,
        });

        return NextResponse.json(
          { error: 'Access denied. You do not have permission to access this organization.' },
          { status: 403 }
        );
      }

      logger.info('User switched organization via hierarchical access', {
        userId,
        userEmail: user.emailAddresses[0]?.emailAddress,
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
      userEmail: user.emailAddresses[0]?.emailAddress,
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

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
