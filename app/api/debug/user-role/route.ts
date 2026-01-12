import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { db } from '@/db/db';
import { organizationMembers, organizations } from '@/db/schema-organizations';
import { eq, and } from 'drizzle-orm';

export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get all memberships for this user
    const memberships = await db
      .select({
        organizationId: organizationMembers.organizationId,
        organizationName: organizations.name,
        role: organizationMembers.role,
        status: organizationMembers.status,
        email: organizationMembers.email,
        joinedAt: organizationMembers.joinedAt
      })
      .from(organizationMembers)
      .leftJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
      .where(eq(organizationMembers.userId, userId));

    // Get Default Organization ID
    const [defaultOrg] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.name, 'Default Organization'));

    return NextResponse.json({
      userId,
      defaultOrganizationId: defaultOrg?.id,
      memberships,
      totalMemberships: memberships.length
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json({ 
      error: 'Internal error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
