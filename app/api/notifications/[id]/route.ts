/**
 * API Route: PATCH /api/notifications/[id]
 * 
 * Mark notification as read
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { inAppNotifications } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = params;

    // Update notification
    const result = await db
      .update(inAppNotifications)
      .set({
        read: true,
        readAt: new Date(),
      })
      .where(
        and(
          eq(inAppNotifications.id, id),
          eq(inAppNotifications.userId, userId)
        )
      )
      .returning();

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * API Route: DELETE /api/notifications/[id]
 * 
 * Delete notification
 */

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = params;

    // Delete notification
    const result = await db
      .delete(inAppNotifications)
      .where(
        and(
          eq(inAppNotifications.id, id),
          eq(inAppNotifications.userId, userId)
        )
      )
      .returning();

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting notification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
