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

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { 
  newsletterDistributionLists, 
  newsletterListSubscribers,
  profiles 
} from '@/db/schema';
import { and, inArray } from 'drizzle-orm';
import { withOrganizationAuth } from '@/lib/organization-middleware';

import { standardSuccessResponse } from '@/lib/api/standardized-responses';
const addSubscribersSchema = z.object({
  profileIds: z.array(z.string()).min(1, 'At least one profile ID required'),
});

const removeSubscribersSchema = z.object({
  subscriberIds: z.array(z.string()).min(1, 'At least one subscriber ID required'),
});

export const GET = withOrganizationAuth(async (
  request: NextRequest,
  context,
  params?: { id: string }
) => {
  try {
    const { organizationId } = context;

    if (!params?.id) {
      return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'List ID required'
    );
    }

    // Verify list exists and user has access
    const [list] = await db
      .select()
      .from(newsletterDistributionLists)
      .where(
        and(
          eq(newsletterDistributionLists.id, params.id),
          eq(newsletterDistributionLists.organizationId, organizationId)
        )
      );

    if (!list) {
      return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'List not found'
    );
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
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch subscribers',
      error
    );
  }
});

export const POST = withOrganizationAuth(async (
  request: NextRequest,
  context,
  params?: { id: string }
) => {
  try {
    const { organizationId } = context;

    if (!params?.id) {
      return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'List ID required'
    );
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
          eq(newsletterDistributionLists.organizationId, organizationId)
        )
      );

    if (!list) {
      return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'List not found'
    );
    }

    // Get profile emails
    // Note: profiles table uses userId as PK and has no organizationId
    const profilesData = await db
      .select()
      .from(profiles)
      .where(inArray(profiles.userId, profileIds));

    if (profilesData.length === 0) {
      return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'No valid profiles found'
    );
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

    return standardSuccessResponse(
      {  
      subscribers,
      added: subscribers.length,
      skipped: profilesData.length - subscribers.length,
     },
      undefined,
      201
    );
  } catch (error) {
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to add subscribers',
      error
    );
  }
});

export const DELETE = withOrganizationAuth(async (
  request: NextRequest,
  context,
  params?: { id: string }
) => {
  try {
    const { organizationId } = context;

    if (!params?.id) {
      return standardErrorResponse(
        ErrorCode.MISSING_REQUIRED_FIELD,
        'List ID required'
      );
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
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to remove subscribers',
      error
    );
  }
});
