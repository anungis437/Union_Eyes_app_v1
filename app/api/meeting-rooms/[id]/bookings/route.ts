import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * POST /api/meeting-rooms/[id]/book
 * Book a meeting room
 * 
 * GET /api/meeting-rooms/[id]/bookings
 * Get bookings for a room
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { meetingRooms, roomBookings, calendarEvents } from '@/db/schema/calendar-schema';
import { and, or, desc } from 'drizzle-orm';
import { z } from "zod";
import { withEnhancedRoleAuth } from "@/lib/api-auth-guard";

import { standardSuccessResponse } from '@/lib/api/standardized-responses';

const meetingRoomsBookingsSchema = z.object({
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  purpose: z.unknown().optional(),
  bookedFor: z.unknown().optional(),
  setupRequired: z.unknown().optional().default(false),
  setupTime: z.string().datetime().optional().default(0),
  cateringRequired: z.unknown().optional().default(false),
  cateringNotes: z.string().optional(),
  specialRequests: z.unknown().optional(),
  attendeeCount: z.number().int().positive(),
  eventId: z.string().uuid('Invalid eventId'),
  // Optional: z.unknown().optional(),
});

export const POST = async (request: NextRequest, { params }: { params: { id: string } }) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      const roomId = params.id;
      const body = await request.json();
    // Validate request body
    const validation = meeting-roomsBookingsSchema.safeParse(body);
    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request data',
        validation.error.errors
      );
    }
    
    const validatedData = validation.data;

      const {
        startTime,
        endTime,
        purpose,
        bookedFor,
        setupRequired = false,
        setupTime = 0,
        cateringRequired = false,
        cateringNotes,
        specialRequests,
        attendeeCount,
        eventId, // Optional: link to calendar event
        metadata,
      } = validatedData;

      // Validation
      if (!startTime || !endTime || !purpose) {
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Start time, end time, and purpose are required'
    );
      }

      const start = new Date(startTime);
      const end = new Date(endTime);

      if (end <= start) {
        return NextResponse.json(
          { error: 'End time must be after start time' },
          { status: 400 }
        );
      }

      // Get room details
      const [room] = await db
        .select()
        .from(meetingRooms)
        .where(eq(meetingRooms.id, roomId))
        .limit(1);

      if (!room) {
        return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Meeting room not found'
    );
      }

      if (!room.isActive || room.status !== 'available') {
        return NextResponse.json(
          { error: 'Room is not available for booking' },
          { status: 400 }
        );
      }

      // Check duration limits
      const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);

      if (durationMinutes < (room.minBookingDuration || 0)) {
        return NextResponse.json(
          { error: `Minimum booking duration is ${room.minBookingDuration} minutes` },
          { status: 400 }
        );
      }

      if (durationMinutes > (room.maxBookingDuration || Infinity)) {
        return NextResponse.json(
          { error: `Maximum booking duration is ${room.maxBookingDuration} minutes` },
          { status: 400 }
        );
      }

      // Check advance booking limit
      const advanceDays = (start.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      if (advanceDays > (room.advanceBookingDays || Infinity)) {
        return NextResponse.json(
          { error: `Cannot book more than ${room.advanceBookingDays} days in advance` },
          { status: 400 }
        );
      }

      // Check for conflicts
      const conflictingBookings = await db
        .select()
        .from(roomBookings)
        .where(
          and(
            eq(roomBookings.roomId, roomId),
            or(
              and(
                lte(roomBookings.startTime, start),
                gte(roomBookings.endTime, start)
              ),
              and(
                lte(roomBookings.startTime, end),
                gte(roomBookings.endTime, end)
              ),
              and(
                gte(roomBookings.startTime, start),
                lte(roomBookings.endTime, end)
              )
            ),
            or(
              eq(roomBookings.status, 'scheduled'),
              eq(roomBookings.status, 'confirmed')
            )
          )
        );

      if (conflictingBookings.length > 0) {
        return NextResponse.json(
          { error: 'Room is already booked for this time slot' },
          { status: 409 }
        );
      }

      // Create booking
      const [newBooking] = await db
        .insert(roomBookings)
        .values({
          roomId,
          eventId,
          organizationId: room.organizationId,
          bookedBy: userId,
          bookedFor,
          purpose,
          startTime: start,
          endTime: end,
          setupRequired,
          setupTime,
          cateringRequired,
          cateringNotes,
          specialRequests,
          attendeeCount,
          status: room.requiresApproval ? 'scheduled' : 'confirmed',
          requiresApproval: room.requiresApproval,
          metadata,
        })
        .returning();

      // If linked to event, update event with room info
      if (eventId) {
        await db
          .update(calendarEvents)
          .set({
            meetingRoomId: roomId,
            location: `${room.displayName || room.name}${room.buildingName ? ` - ${room.buildingName}` : ''}`,
            updatedAt: new Date(),
          })
          .where(eq(calendarEvents.id, eventId));
      }

      return standardSuccessResponse(
      { 
        message: room.requiresApproval
          ? 'Booking request submitted for approval'
          : 'Room booked successfully',
        booking: newBooking,
        requiresApproval: room.requiresApproval,
       },
      undefined,
      201
    );
    } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to book meeting room',
      error
    );
    }
    })(request, { params });
};

export const GET = async (request: NextRequest, { params }: { params: { id: string } }) => {
  return withEnhancedRoleAuth(10, async (request, context) => {
  try {
      const roomId = params.id;
      const { searchParams } = new URL(request.url);

      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');
      const status = searchParams.get('status');

      // Build query
      const conditions = [eq(roomBookings.roomId, roomId)];

      if (startDate) {
        conditions.push(gte(roomBookings.startTime, new Date(startDate)));
      }

      if (endDate) {
        conditions.push(lte(roomBookings.endTime, new Date(endDate)));
      }

      if (status) {
        conditions.push(eq(roomBookings.status, status as any));
      }

      const bookings = await db
        .select()
        .from(roomBookings)
        .where(and(...conditions))
        .orderBy(desc(roomBookings.startTime));

      return NextResponse.json({
        bookings,
        count: bookings.length,
      });
    } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to get room bookings',
      error
    );
    }
    })(request, { params });
};
