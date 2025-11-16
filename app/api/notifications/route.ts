/**
 * API Route: GET /api/notifications
 * 
 * Get in-app notifications for current user
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { inAppNotifications } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

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
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build query
    let query = db
      .select()
      .from(inAppNotifications)
      .where(eq(inAppNotifications.userId, userId))
      .orderBy(desc(inAppNotifications.createdAt))
      .limit(limit);

    if (unreadOnly) {
      query = db
        .select()
        .from(inAppNotifications)
        .where(
          and(
            eq(inAppNotifications.userId, userId),
            eq(inAppNotifications.read, false)
          )
        )
        .orderBy(desc(inAppNotifications.createdAt))
        .limit(limit);
    }

    const notifications = await query;

    // Get unread count
    const unreadCount = await db
      .select({ count: db.$count() })
      .from(inAppNotifications)
      .where(
        and(
          eq(inAppNotifications.userId, userId),
          eq(inAppNotifications.read, false)
        )
      );

    return NextResponse.json({
      notifications,
      unreadCount: unreadCount[0]?.count || 0,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
