/**
 * GET /api/calendars
 * List calendars for the authenticated user
 * 
 * POST /api/calendars
 * Create a new calendar
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db/db';
import { calendars, calendarSharing } from '@/db/schema/calendar-schema';
import { eq, and, or, desc } from 'drizzle-orm';

/**
 * GET /api/calendars
 * List user's calendars (owned + shared)
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeShared = searchParams.get('includeShared') !== 'false';

    // Get owned calendars
    const ownedCalendars = await db
      .select()
      .from(calendars)
      .where(
        and(
          eq(calendars.ownerId, userId),
          eq(calendars.isActive, true)
        )
      )
      .orderBy(desc(calendars.createdAt));

    let sharedCalendars: any[] = [];

    if (includeShared) {
      // Get calendars shared with user
      const sharedPermissions = await db
        .select({
          calendar: calendars,
          permission: calendarSharing.permission,
          canCreateEvents: calendarSharing.canCreateEvents,
          canEditEvents: calendarSharing.canEditEvents,
          canDeleteEvents: calendarSharing.canDeleteEvents,
        })
        .from(calendarSharing)
        .innerJoin(calendars, eq(calendarSharing.calendarId, calendars.id))
        .where(
          and(
            eq(calendarSharing.sharedWithUserId, userId),
            eq(calendarSharing.isActive, true),
            eq(calendars.isActive, true)
          )
        );

      sharedCalendars = sharedPermissions.map(sp => ({
        ...sp.calendar,
        permission: sp.permission,
        canCreateEvents: sp.canCreateEvents,
        canEditEvents: sp.canEditEvents,
        canDeleteEvents: sp.canDeleteEvents,
        isSharedWithMe: true,
      }));
    }

    return NextResponse.json({
      calendars: [
        ...ownedCalendars.map(cal => ({ ...cal, isOwned: true })),
        ...sharedCalendars,
      ],
    });
  } catch (error) {
    console.error('List calendars error:', error);
    return NextResponse.json(
      { error: 'Failed to list calendars' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/calendars
 * Create new calendar
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      description,
      color,
      icon,
      isPersonal = true,
      isShared = false,
      isPublic = false,
      timezone = 'America/New_York',
      defaultEventDuration = 60,
      reminderDefaultMinutes = 15,
      allowOverlap = true,
      requireApproval = false,
      metadata,
    } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Calendar name is required' },
        { status: 400 }
      );
    }

    // Get tenant ID from user metadata or use default
    // TODO: Extract from user's organization
    const tenantId = 'default';

    const [newCalendar] = await db
      .insert(calendars)
      .values({
        tenantId,
        name,
        description,
        color,
        icon,
        ownerId: userId,
        isPersonal,
        isShared,
        isPublic,
        timezone,
        defaultEventDuration,
        reminderDefaultMinutes,
        allowOverlap,
        requireApproval,
        metadata,
      })
      .returning();

    return NextResponse.json({
      message: 'Calendar created successfully',
      calendar: newCalendar,
    }, { status: 201 });
  } catch (error) {
    console.error('Create calendar error:', error);
    return NextResponse.json(
      { error: 'Failed to create calendar' },
      { status: 500 }
    );
  }
}
