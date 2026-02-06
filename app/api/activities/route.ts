/**
 * API Route: GET /api/activities
 * 
 * Get recent activity feed for the organization
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { organizationMembers } from '@/db/schema';
import { eq, and, desc, sql, or, isNull } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const tenantId = searchParams.get('tenantId');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId parameter is required' },
        { status: 400 }
      );
    }

    console.log('[API /api/activities] Fetching activities for tenantId:', tenantId);

    // Get recent member additions (simplified approach for now)
    const recentMembers = await db
      .select({
        id: organizationMembers.id,
        type: sql<string>`'member_joined'`,
        claimNumber: sql<string>`NULL`,
        title: sql<string>`NULL`,
        status: sql<string>`NULL`,
        priority: sql<string>`NULL`,
        createdBy: organizationMembers.userId,
        createdAt: organizationMembers.createdAt,
        description: sql<string>`'Member joined the organization'`,
        email: organizationMembers.email,
      })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, tenantId),
          or(
            isNull(organizationMembers.deletedAt),
            sql`${organizationMembers.deletedAt} IS NULL`
          )
        )
      )
      .orderBy(desc(organizationMembers.createdAt))
      .limit(limit);

    // Map to activity format
    const activities = recentMembers.map(a => ({
      id: a.id,
      type: 'member_joined',
      claimNumber: null,
      title: null,
      status: null,
      priority: null,
      createdBy: a.createdBy,
      createdAt: a.createdAt,
      description: `New member: ${a.email || 'Unknown'}`,
      icon: 'user',
      color: 'purple',
    }));

    console.log('[API /api/activities] Returning', activities.length, 'activities');

    return NextResponse.json({
      activities: activities,
      count: activities.length,
    });
  } catch (error) {
    console.error('Error fetching activities:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
