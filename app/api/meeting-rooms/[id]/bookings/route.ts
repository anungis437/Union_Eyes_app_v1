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
import { eq, and, or, gte, lte, desc } from 'drizzle-orm';
import { z } from "zod";
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";

export const POST = async (request: NextRequest, { params }: { params: { id: string } }) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      const roomId = params.id;
      const body = await request.json();

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
      } = body;

      // Validation
      if (!startTime || !endTime || !purpose) {
        return NextResponse.json(
          { error: 'Start time, end time, and purpose are required' },
          { status: 400 }
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
        return NextResponse.json({ error: 'Meeting room not found' }, { status: 404 });
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
          tenantId: room.tenantId,
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

      return NextResponse.json({
        message: room.requiresApproval
          ? 'Booking request submitted for approval'
          : 'Room booked successfully',
        booking: newBooking,
        requiresApproval: room.requiresApproval,
      }, { status: 201 });
    } catch (error) {
      console.error('Book meeting room error:', error);
      return NextResponse.json(
        { error: 'Failed to book meeting room' },
        { status: 500 }
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
      console.error('Get room bookings error:', error);
      return NextResponse.json(
        { error: 'Failed to get room bookings' },
        { status: 500 }
      );
    }
    })(request, { params });
};
