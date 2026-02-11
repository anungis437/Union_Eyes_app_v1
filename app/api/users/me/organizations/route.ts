import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * Get current user's organizations
 * 
 * Returns all organizations the authenticated user has access to,
 * along with their membership details.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { organizations, organizationMembers } from '@/db/schema-organizations';
import { eq } from 'drizzle-orm';
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { logger } from '@/lib/logger';

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
export const dynamic = 'force-dynamic';

export const GET = async (req: NextRequest) => {
  return withRoleAuth(10, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      logger.debug('[API /api/users/me/organizations] Auth userId', { userId });

      // Get user's memberships
      logger.debug('[API /api/users/me/organizations] Fetching memberships', { userId });
      const memberships = await db
        .select()
        .from(organizationMembers)
        .where(eq(organizationMembers.userId, userId));

      logger.debug('[API /api/users/me/organizations] Found memberships', { count: memberships.length });

      if (memberships.length === 0) {
        return NextResponse.json({
          organizations: [],
          memberships: [],
        });
      }

      // Get organization details for each membership
      // organizationId stores the UUID (as TEXT) matching organizations.id
      const orgIds = Array.from(new Set(
        memberships
          .map(m => m.organizationId) // This is the UUID as text
          .filter(id => id !== null && id !== undefined)
      ));
      
      logger.debug('[API /api/users/me/organizations] Organization IDs', { orgIds });

      if (orgIds.length === 0) {
        logger.warn('[API /api/users/me/organizations] No valid organization IDs found');
        return NextResponse.json({
          organizations: [],
          memberships,
        });
      }

      // Get organizations by ID (organizationId in memberships matches organizations.id)
      const allOrganizations = await Promise.all(
        orgIds.map(async (orgId) => {
          try {
            const [org] = await db
              .select({
                id: organizations.id,
                name: organizations.name,
                slug: organizations.slug,
                type: organizations.organizationType,
                parentId: organizations.parentId,
                createdAt: organizations.createdAt,
                updatedAt: organizations.updatedAt,
              })
              .from(organizations)
              .where(eq(organizations.id, orgId))
              .limit(1);
            
            if (!org) {
              logger.warn('[API /api/users/me/organizations] Organization not found for membership', { orgId });
            }
            return org;
          } catch (err) {
            logger.error('[API /api/users/me/organizations] Error fetching org', err as Error, { orgId });
            return undefined;
          }
        })
      );

      logger.debug('[API /api/users/me/organizations] Found organizations', { count: allOrganizations.filter(o => o).length });
      logger.debug('[API /api/users/me/organizations] Missing organizations', { count: allOrganizations.filter(o => !o).length });

      // Filter out any null results
      const validOrganizations = allOrganizations.filter(org => org !== undefined && org !== null);

      if (validOrganizations.length === 0 && memberships.length > 0) {
        logger.error('[API /api/users/me/organizations] Memberships found with no valid organizations', undefined, { orgIds });
      }

      return NextResponse.json({
        organizations: validOrganizations,
        memberships,
      });
    } catch (error) {
      logger.error('Error fetching user organizations', error as Error);
      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch organizations',
      error
    );
    }
    })(request);
};

