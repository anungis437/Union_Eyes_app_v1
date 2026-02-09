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

export const dynamic = 'force-dynamic';

export const GET = async (req: NextRequest) => {
  return withRoleAuth(10, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      console.log('[API /api/users/me/organizations] Auth userId:', userId);

      // Get user's memberships
      console.log('[API /api/users/me/organizations] Fetching memberships for userId:', userId);
      const memberships = await db
        .select()
        .from(organizationMembers)
        .where(eq(organizationMembers.userId, userId));

      console.log('[API /api/users/me/organizations] Found memberships:', memberships.length);

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
      
      console.log('[API /api/users/me/organizations] Organization IDs:', orgIds);

      if (orgIds.length === 0) {
        console.log('[API /api/users/me/organizations] No valid organization IDs found');
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
              console.log('[API /api/users/me/organizations] Organization not found for ID:', orgId);
              console.log('[API /api/users/me/organizations] This membership references a non-existent organization');
            }
            return org;
          } catch (err) {
            console.error('[API /api/users/me/organizations] Error fetching org:', orgId, err);
            return undefined;
          }
        })
      );

      console.log('[API /api/users/me/organizations] Found organizations:', allOrganizations.filter(o => o).length);
      console.log('[API /api/users/me/organizations] Missing organizations:', allOrganizations.filter(o => !o).length);

      // Filter out any null results
      const validOrganizations = allOrganizations.filter(org => org !== undefined && org !== null);

      if (validOrganizations.length === 0 && memberships.length > 0) {
        console.error('[API /api/users/me/organizations] CRITICAL: User has memberships but no valid organizations found!');
        console.error('[API /api/users/me/organizations] Membership organization IDs:', orgIds);
        console.error('[API /api/users/me/organizations] This indicates orphaned memberships or database inconsistency');
      }

      return NextResponse.json({
        organizations: validOrganizations,
        memberships,
      });
    } catch (error) {
      console.error('Error fetching user organizations:', error);
      return NextResponse.json(
        { error: 'Failed to fetch organizations' },
        { status: 500 }
      );
    }
    })(request);
};
