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
import { and, or } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { z } from "zod";
import { withApiAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';

import { standardSuccessResponse } from '@/lib/api/standardized-responses';
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
      const query = db
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
      logger.error('List meeting rooms error', { error });
      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to list meeting rooms',
      error
    );
    }
    })(request);
};


const meetingRoomsSchema = z.object({
  name: z.string().min(1, 'name is required'),
  displayName: z.boolean().optional(),
  description: z.string().optional(),
  buildingName: z.string().min(1, 'buildingName is required'),
  floor: z.unknown().optional(),
  roomNumber: z.unknown().optional(),
  address: z.unknown().optional(),
  capacity: z.unknown().optional().default(10),
  features: z.unknown().optional().default([]),
  equipment: z.unknown().optional().default([]),
  requiresApproval: z.unknown().optional().default(false),
  minBookingDuration: z.unknown().optional().default(30),
  maxBookingDuration: z.unknown().optional().default(480),
  advanceBookingDays: z.unknown().optional().default(90),
  operatingHours: z.unknown().optional(),
  allowedUserRoles: z.unknown().optional(),
  blockedDates: z.string().datetime().optional(),
  contactPersonId: z.string().uuid('Invalid contactPersonId'),
  contactEmail: z.string().email('Invalid email address'),
  contactPhone: z.string().min(10, 'Invalid phone number'),
  imageUrl: z.string().url('Invalid URL'),
  floorPlanUrl: z.string().url('Invalid URL'),
  metadata: z.unknown().optional(),
});

export const POST = async (request: NextRequest) => {
  return withRoleAuth(20, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      // Check if user is admin
      const isAdmin = await checkAdminRole(userId);
      if (!isAdmin) {
        return standardErrorResponse(ErrorCode.FORBIDDEN, 'Admin access required');
      }

      const body = await request.json();
    // Validate request body
    const validation = meeting-roomsSchema.safeParse(body);
    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request data',
        validation.error.errors
      );
    }
    
    const { name, displayName, description, buildingName, floor, roomNumber, address, capacity = 10, features = [], equipment = [], requiresApproval = false, minBookingDuration = 30, maxBookingDuration = 480, advanceBookingDays = 90, operatingHours, allowedUserRoles, blockedDates = [], contactPersonId, contactEmail, contactPhone, imageUrl, floorPlanUrl, metadata } = validation.data;
    // DUPLICATE REMOVED (Phase 2): Multi-line destructuring of body
    // const {
    // name,
    // displayName,
    // description,
    // buildingName,
    // floor,
    // roomNumber,
    // address,
    // capacity = 10,
    // features = [],
    // equipment = [],
    // requiresApproval = false,
    // minBookingDuration = 30,
    // maxBookingDuration = 480,
    // advanceBookingDays = 90,
    // operatingHours,
    // allowedUserRoles,
    // blockedDates = [],
    // contactPersonId,
    // contactEmail,
    // contactPhone,
    // imageUrl,
    // floorPlanUrl,
    // metadata,
    // } = body;

      if (!name) {
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Room name is required'
    );
      }

      // Get organization ID
      const organizationScopeId = organizationId;

      const [newRoom] = await db
        .insert(meetingRooms)
        .values({
          organizationId: organizationScopeId,
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

      return standardSuccessResponse(
      { 
        message: 'Meeting room created successfully',
        room: newRoom,
       },
      undefined,
      201
    );
    } catch (error) {
      logger.error('Create meeting room error', { error });
      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to create meeting room',
      error
    );
    }
    })(request);
};
