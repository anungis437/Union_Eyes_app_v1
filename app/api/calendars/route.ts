import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * GET /api/calendars
 * List calendars for the authenticated user
 * 
 * POST /api/calendars
 * Create a new calendar
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { calendars, calendarSharing } from '@/db/schema/calendar-schema';
import { eq, and, or, desc } from 'drizzle-orm';
import { z } from "zod";
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';

export const GET = async (request: NextRequest) => {
  return withRoleAuth(10, async (request, context) => {
    const { userId, organizationId } = context;

  try {
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
return NextResponse.json(
        { error: 'Failed to list calendars' },
        { status: 500 }
      );
    }
    })(request);
};

export const POST = async (request: NextRequest) => {
  return withRoleAuth(20, async (request, context) => {
    const { userId, organizationId } = context;

  try {
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

      // Validate organization context
      if (!organizationId) {
        return NextResponse.json(
          { error: 'No active organization' },
          { status: 400 }
        );
      }

      // Use organization ID as tenant ID for proper multi-tenant isolation
      const tenantId = organizationId;

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
return NextResponse.json(
        { error: 'Failed to create calendar' },
        { status: 500 }
      );
    }
    })(request);
};

