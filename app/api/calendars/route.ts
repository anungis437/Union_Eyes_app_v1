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

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
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
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to list calendars',
      error
    );
    }
    })(request);
};


const calendarsSchema = z.object({
  name: z.string().min(1, 'name is required'),
  description: z.string().optional(),
  color: z.unknown().optional(),
  icon: z.unknown().optional(),
  isPersonal: z.boolean().optional().default(true),
  isShared: z.boolean().optional().default(false),
  isPublic: z.boolean().optional().default(false),
  timezone: z.string().datetime().optional().default('America/New_York'),
  defaultEventDuration: z.unknown().optional().default(60),
  reminderDefaultMinutes: z.unknown().optional().default(15),
  allowOverlap: z.unknown().optional().default(true),
  requireApproval: z.unknown().optional().default(false),
  metadata: z.unknown().optional(),
});

export const POST = async (request: NextRequest) => {
  return withRoleAuth(20, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      const body = await request.json();
    // Validate request body
    const validation = calendarsSchema.safeParse(body);
    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request data',
        validation.error.errors
      );
    }
    
    const { name, description, color, icon, isPersonal = true, isShared = false, isPublic = false, timezone = 'America/New_York', defaultEventDuration = 60, reminderDefaultMinutes = 15, allowOverlap = true, requireApproval = false, metadata } = validation.data;
    // DUPLICATE REMOVED (Phase 2): Multi-line destructuring of body
    // const {
    // name,
    // description,
    // color,
    // icon,
    // isPersonal = true,
    // isShared = false,
    // isPublic = false,
    // timezone = 'America/New_York',
    // defaultEventDuration = 60,
    // reminderDefaultMinutes = 15,
    // allowOverlap = true,
    // requireApproval = false,
    // metadata,
    // } = body;

      if (!name) {
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Calendar name is required'
    );
      }

      // Validate organization context
      if (!organizationId) {
        return NextResponse.json(
          { error: 'No active organization' },
          { status: 400 }
        );
      }

      const [newCalendar] = await db
        .insert(calendars)
        .values({
          organizationId,
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

      return standardSuccessResponse(
      { 
        message: 'Calendar created successfully',
        calendar: newCalendar,
       },
      undefined,
      201
    );
    } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to create calendar',
      error
    );
    }
    })(request);
};
