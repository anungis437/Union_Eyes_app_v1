/**
 * GET /api/calendars/[id]
 * Get calendar details
 * 
 * PATCH /api/calendars/[id]
 * Update calendar
 * 
 * DELETE /api/calendars/[id]
 * Delete calendar
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db/db';
import { calendars, calendarSharing } from '@/db/schema/calendar-schema';
import { eq, and } from 'drizzle-orm';

/**
 * GET /api/calendars/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const calendarId = params.id;

    const [calendar] = await db
      .select()
      .from(calendars)
      .where(eq(calendars.id, calendarId))
      .limit(1);

    if (!calendar) {
      return NextResponse.json({ error: 'Calendar not found' }, { status: 404 });
    }

    // Check if user has access
    const isOwner = calendar.ownerId === userId;
    const isPublic = calendar.isPublic;

    if (!isOwner && !isPublic) {
      // Check if calendar is shared with user
      const [sharedPermission] = await db
        .select()
        .from(calendarSharing)
        .where(
          and(
            eq(calendarSharing.calendarId, calendarId),
            eq(calendarSharing.sharedWithUserId, userId),
            eq(calendarSharing.isActive, true)
          )
        )
        .limit(1);

      if (!sharedPermission) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      return NextResponse.json({
        calendar: {
          ...calendar,
          permission: sharedPermission.permission,
          canCreateEvents: sharedPermission.canCreateEvents,
          canEditEvents: sharedPermission.canEditEvents,
          canDeleteEvents: sharedPermission.canDeleteEvents,
        },
      });
    }

    return NextResponse.json({
      calendar: {
        ...calendar,
        isOwner,
        permission: isOwner ? 'owner' : 'viewer',
      },
    });
  } catch (error) {
    console.error('Get calendar error:', error);
    return NextResponse.json(
      { error: 'Failed to get calendar' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/calendars/[id]
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const calendarId = params.id;
    const body = await request.json();

    // Verify ownership or edit permission
    const [calendar] = await db
      .select()
      .from(calendars)
      .where(eq(calendars.id, calendarId))
      .limit(1);

    if (!calendar) {
      return NextResponse.json({ error: 'Calendar not found' }, { status: 404 });
    }

    const isOwner = calendar.ownerId === userId;

    if (!isOwner) {
      // Check edit permission
      const [permission] = await db
        .select()
        .from(calendarSharing)
        .where(
          and(
            eq(calendarSharing.calendarId, calendarId),
            eq(calendarSharing.sharedWithUserId, userId),
            eq(calendarSharing.isActive, true)
          )
        )
        .limit(1);

      if (!permission || permission.permission === 'viewer') {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    const {
      name,
      description,
      color,
      icon,
      isShared,
      isPublic,
      timezone,
      defaultEventDuration,
      reminderDefaultMinutes,
      allowOverlap,
      requireApproval,
      metadata,
    } = body;

    const [updatedCalendar] = await db
      .update(calendars)
      .set({
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(color !== undefined && { color }),
        ...(icon !== undefined && { icon }),
        ...(isShared !== undefined && { isShared }),
        ...(isPublic !== undefined && { isPublic }),
        ...(timezone !== undefined && { timezone }),
        ...(defaultEventDuration !== undefined && { defaultEventDuration }),
        ...(reminderDefaultMinutes !== undefined && { reminderDefaultMinutes }),
        ...(allowOverlap !== undefined && { allowOverlap }),
        ...(requireApproval !== undefined && { requireApproval }),
        ...(metadata !== undefined && { metadata }),
        updatedAt: new Date(),
      })
      .where(eq(calendars.id, calendarId))
      .returning();

    return NextResponse.json({
      message: 'Calendar updated successfully',
      calendar: updatedCalendar,
    });
  } catch (error) {
    console.error('Update calendar error:', error);
    return NextResponse.json(
      { error: 'Failed to update calendar' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/calendars/[id]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const calendarId = params.id;

    // Verify ownership
    const [calendar] = await db
      .select()
      .from(calendars)
      .where(eq(calendars.id, calendarId))
      .limit(1);

    if (!calendar) {
      return NextResponse.json({ error: 'Calendar not found' }, { status: 404 });
    }

    if (calendar.ownerId !== userId) {
      return NextResponse.json({ error: 'Only owner can delete calendar' }, { status: 403 });
    }

    // Soft delete
    await db
      .update(calendars)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(calendars.id, calendarId));

    return NextResponse.json({
      message: 'Calendar deleted successfully',
    });
  } catch (error) {
    console.error('Delete calendar error:', error);
    return NextResponse.json(
      { error: 'Failed to delete calendar' },
      { status: 500 }
    );
  }
}
