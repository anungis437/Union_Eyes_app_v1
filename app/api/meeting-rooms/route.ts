import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * GET /api/meeting-rooms
 * List available meeting rooms
 * 
 * POST /api/meeting-rooms
 * Create a new meeting room (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { db as drizzleDb } from '@/db';
import { meetingRooms, roomBookings } from '@/db/schema/calendar-schema';
import { eq, and, or, gte, lte } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { z } from "zod";
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';

/**
 * Helper to check if user is admin
 */
async function checkAdminRole(userId: string, orgId?: string): Promise<boolean> {
  try {
    const member = await drizzleDb.query.organizationMembers.findFirst({
      where: (organizationMembers, { eq: eqOp }) =>
        eqOp(organizationMembers.userId, userId),
    });

    return member ? ['admin', 'super_admin'].includes(member.role) : false;
  } catch (error) {
    logger.error('Failed to check admin role:', { error });
    return false;
  }
}

export const GET = async (request: NextRequest) => {
  return withRoleAuth(10, async (request, context) => {
  try {
      const { searchParams } = new URL(request.url);
      const startTime = searchParams.get('startTime');
      const endTime = searchParams.get('endTime');
      const capacity = searchParams.get('capacity');
      const features = searchParams.get('features')?.split(',');
      const buildingName = searchParams.get('building');

      // Base query
      let query = db
        .select()
        .from(meetingRooms)
        .where(
          and(
            eq(meetingRooms.isActive, true),
            eq(meetingRooms.status, 'available')
          )
        );

      // Get all rooms first
      const conditions = [
        eq(meetingRooms.isActive, true),
        eq(meetingRooms.status, 'available'),
      ];

      if (buildingName) {
        conditions.push(eq(meetingRooms.buildingName, buildingName));
      }

      let rooms = await db
        .select()
        .from(meetingRooms)
        .where(and(...conditions));

      // Filter by capacity
      if (capacity) {
        const minCapacity = parseInt(capacity);
        rooms = rooms.filter(room => (room.capacity || 0) >= minCapacity);
      }

      // Filter by features
      if (features && features.length > 0) {
        rooms = rooms.filter(room => {
          const roomFeatures = room.features || [];
          return features.every(feature => roomFeatures.includes(feature));
        });
      }

      // Check availability for time range
      if (startTime && endTime) {
        const start = new Date(startTime);
        const end = new Date(endTime);

        // Get all bookings that overlap with requested time
        const overlappingBookings = await db
          .select()
          .from(roomBookings)
          .where(
            and(
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

        const bookedRoomIds = new Set(overlappingBookings.map(b => b.roomId));

        rooms = rooms.map(room => ({
          ...room,
          isAvailable: !bookedRoomIds.has(room.id),
        }));
      } else {
        rooms = rooms.map(room => ({ ...room, isAvailable: true }));
      }

      return NextResponse.json({
        rooms,
        count: rooms.length,
      });
    } catch (error) {
      console.error('List meeting rooms error:', error);
      return NextResponse.json(
        { error: 'Failed to list meeting rooms' },
        { status: 500 }
      );
    }
    })(request);
};

export const POST = async (request: NextRequest) => {
  return withRoleAuth(20, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      // Check if user is admin
      const isAdmin = await checkAdminRole(userId);
      if (!isAdmin) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      }

      const body = await request.json();
      const {
        name,
        displayName,
        description,
        buildingName,
        floor,
        roomNumber,
        address,
        capacity = 10,
        features = [],
        equipment = [],
        requiresApproval = false,
        minBookingDuration = 30,
        maxBookingDuration = 480,
        advanceBookingDays = 90,
        operatingHours,
        allowedUserRoles,
        blockedDates = [],
        contactPersonId,
        contactEmail,
        contactPhone,
        imageUrl,
        floorPlanUrl,
        metadata,
      } = body;

      if (!name) {
        return NextResponse.json(
          { error: 'Room name is required' },
          { status: 400 }
        );
      }

      // Get tenant ID
      const tenantId = organizationId;

      const [newRoom] = await db
        .insert(meetingRooms)
        .values({
          tenantId,
          name,
          displayName: displayName || name,
          description,
          buildingName,
          floor,
          roomNumber,
          address,
          capacity,
          features,
          equipment,
          requiresApproval,
          minBookingDuration,
          maxBookingDuration,
          advanceBookingDays,
          operatingHours,
          allowedUserRoles,
          blockedDates,
          contactPersonId,
          contactEmail,
          contactPhone,
          imageUrl,
          floorPlanUrl,
          metadata,
        })
        .returning();

      return NextResponse.json({
        message: 'Meeting room created successfully',
        room: newRoom,
      }, { status: 201 });
    } catch (error) {
      console.error('Create meeting room error:', error);
      return NextResponse.json(
        { error: 'Failed to create meeting room' },
        { status: 500 }
      );
    }
    })(request);
};

