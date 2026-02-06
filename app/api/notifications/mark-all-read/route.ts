/**
 * API Route: POST /api/notifications/mark-all-read
 * 
 * Mark all notifications as read for current user
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { inAppNotifications } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Mark all unread notifications as read
    await db
      .update(inAppNotifications)
      .set({
        read: true,
        readAt: new Date(),
      })
      .where(
        and(
          eq(inAppNotifications.userId, userId),
          eq(inAppNotifications.read, false)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
