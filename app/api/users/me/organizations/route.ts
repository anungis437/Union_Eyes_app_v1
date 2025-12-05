/**
 * Get current user's organizations
 * 
 * Returns all organizations the authenticated user has access to,
 * along with their membership details.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db/db';
import { organizations, organizationMembers } from '@/db/schema-organizations';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's memberships
    const memberships = await db
      .select()
      .from(organizationMembers)
      .where(eq(organizationMembers.userId, userId));

    if (memberships.length === 0) {
      return NextResponse.json({
        organizations: [],
        memberships: [],
      });
    }

    // Get organization details for each membership
    // Note: organization_id in database is TEXT (organization slug), not UUID
    // We need to get unique organization slugs from memberships
    const orgSlugs = Array.from(new Set(memberships.map(m => m.organizationId)));
    
    if (orgSlugs.length === 0) {
      return NextResponse.json({
        organizations: [],
        memberships,
      });
    }

    // Get organizations by slug (organization_id is actually the slug)
    const allOrganizations = await Promise.all(
      orgSlugs.map(async (slug) => {
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
          .where(eq(organizations.slug, slug))
          .limit(1);
        return org;
      })
    );

    // Filter out any null results
    const validOrganizations = allOrganizations.filter(org => org !== undefined);

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
}
