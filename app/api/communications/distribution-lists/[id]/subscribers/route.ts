/**
 * Newsletter List Subscribers API
 * 
 * Endpoints:
 * - GET /api/communications/distribution-lists/[id]/subscribers - Get subscribers
 * - POST /api/communications/distribution-lists/[id]/subscribers - Add subscribers
 * - DELETE /api/communications/distribution-lists/[id]/subscribers - Remove subscribers
 * 
 * Version: 1.0.0
 * Created: December 6, 2025
 */
// TODO: Migrate to withApiAuth wrapper pattern for consistency
// Original pattern used getCurrentUser() with manual auth checks


import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { 
  newsletterDistributionLists, 
  newsletterListSubscribers,
  profiles 
} from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';

const addSubscribersSchema = z.object({
  profileIds: z.array(z.string()).min(1, 'At least one profile ID required'),
});

const removeSubscribersSchema = z.object({
  subscriberIds: z.array(z.string()).min(1, 'At least one subscriber ID required'),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!user.tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }

    // Verify list exists and user has access
    const [list] = await db
      .select()
      .from(newsletterDistributionLists)
      .where(
        and(
          eq(newsletterDistributionLists.id, params.id),
          eq(newsletterDistributionLists.organizationId, user.tenantId)
        )
      );

    if (!list) {
      return NextResponse.json({ error: 'List not found' }, { status: 404 });
    }

    // Get subscribers with profile details
    // Note: profiles table uses userId as PK, but newsletterListSubscribers.profileId expects uuid
    // For now, skip the join and return subscriber data without profile details
    const subscribers = await db
      .select({
        id: newsletterListSubscribers.id,
        email: newsletterListSubscribers.email,
        status: newsletterListSubscribers.status,
        subscribedAt: newsletterListSubscribers.subscribedAt,
        unsubscribedAt: newsletterListSubscribers.unsubscribedAt,
        profileId: newsletterListSubscribers.profileId,
      })
      .from(newsletterListSubscribers)
      .where(eq(newsletterListSubscribers.listId, params.id));

    return NextResponse.json({ subscribers });
  } catch (error) {
    console.error('Error fetching subscribers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscribers' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!user.tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }

    const body = await request.json();
    const { profileIds } = addSubscribersSchema.parse(body);

    // Verify list exists
    const [list] = await db
      .select()
      .from(newsletterDistributionLists)
      .where(
        and(
          eq(newsletterDistributionLists.id, params.id),
          eq(newsletterDistributionLists.organizationId, user.tenantId)
        )
      );

    if (!list) {
      return NextResponse.json({ error: 'List not found' }, { status: 404 });
    }

    // Get profile emails
    // Note: profiles table uses userId as PK and has no tenantId
    const profilesData = await db
      .select()
      .from(profiles)
      .where(inArray(profiles.userId, profileIds));

    if (profilesData.length === 0) {
      return NextResponse.json({ error: 'No valid profiles found' }, { status: 400 });
    }

    // Insert subscribers
    const subscribersToInsert = profilesData.map((profile) => ({
      listId: params.id,
      profileId: profile.userId,
      email: profile.email || '',
      status: 'subscribed' as const,
      subscribedAt: new Date(),
    }));

    const subscribers = await db
      .insert(newsletterListSubscribers)
      .values(subscribersToInsert)
      .onConflictDoNothing()
      .returning();

    return NextResponse.json({ 
      subscribers,
      added: subscribers.length,
      skipped: profilesData.length - subscribers.length,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error adding subscribers:', error);
    return NextResponse.json(
      { error: 'Failed to add subscribers' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!user.tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }

    const body = await request.json();
    const { subscriberIds } = removeSubscribersSchema.parse(body);

    await db
      .delete(newsletterListSubscribers)
      .where(
        and(
          eq(newsletterListSubscribers.listId, params.id),
          inArray(newsletterListSubscribers.id, subscriberIds)
        )
      );

    return NextResponse.json({ success: true, removed: subscriberIds.length });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error removing subscribers:', error);
    return NextResponse.json(
      { error: 'Failed to remove subscribers' },
      { status: 500 }
    );
  }
}
