import { logApiAuditEvent } from "@/lib/middleware/api-security";
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
import { db } from '@/db/db';
import { calendars, calendarSharing } from '@/db/schema/calendar-schema';
import { eq, and } from 'drizzle-orm';
import { z } from "zod";
import { withEnhancedRoleAuth } from "@/lib/api-auth-guard";

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
export const GET = async (request: NextRequest, { params }: { params: { id: string } }) => {
  return withEnhancedRoleAuth(10, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      const calendarId = params.id;

      const [calendar] = await db
        .select()
        .from(calendars)
        .where(eq(calendars.id, calendarId))
        .limit(1);

      if (!calendar) {
        return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Calendar not found'
    );
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
          return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Access denied'
    );
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
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to get calendar',
      error
    );
    }
    })(request, { params });
};


const calendarsSchema = z.object({
  name: z.string().min(1, 'name is required'),
  description: z.string().optional(),
  color: z.unknown().optional(),
  icon: z.unknown().optional(),
  isShared: z.boolean().optional(),
  isPublic: z.boolean().optional(),
  timezone: z.string().datetime().optional(),
  defaultEventDuration: z.unknown().optional(),
  reminderDefaultMinutes: z.unknown().optional(),
  allowOverlap: z.unknown().optional(),
  requireApproval: z.unknown().optional(),
  metadata: z.unknown().optional(),
});

export const PATCH = async (request: NextRequest, { params }: { params: { id: string } }) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      const calendarId = params.id;
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
    
    const { name, description, color, icon, isShared, isPublic, timezone, defaultEventDuration, reminderDefaultMinutes, allowOverlap, requireApproval, metadata } = validation.data;

      // Verify ownership or edit permission
      const [calendar] = await db
        .select()
        .from(calendars)
        .where(eq(calendars.id, calendarId))
        .limit(1);

      if (!calendar) {
        return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Calendar not found'
    );
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
          return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Access denied'
    );
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
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to update calendar',
      error
    );
    }
    })(request, { params });
};

export const DELETE = async (request: NextRequest, { params }: { params: { id: string } }) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      const calendarId = params.id;

      // Verify ownership
      const [calendar] = await db
        .select()
        .from(calendars)
        .where(eq(calendars.id, calendarId))
        .limit(1);

      if (!calendar) {
        return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Calendar not found'
    );
      }

      if (calendar.ownerId !== userId) {
        return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Only owner can delete calendar'
    );
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
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to delete calendar',
      error
    );
    }
    })(request, { params });
};
