import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { courseRegistrations, courseSessions, trainingCourses, members } from "@/db/schema";
import { and, inArray } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { withEnhancedRoleAuth } from "@/lib/api-auth-guard";

import { standardSuccessResponse } from '@/lib/api/standardized-responses';
// GET /api/education/sessions/[id]/attendance - Get attendance records for session
export const GET = async (request: NextRequest, { params }: { params: { id: string } }) => {
  return withEnhancedRoleAuth(10, async (request, context) => {
  try {
      const sessionId = params.id;

      if (!sessionId) {
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Session ID is required'
    );
      }

      // Get session details
      const session = await db
        .select({
          id: courseSessions.id,
          sessionCode: courseSessions.sessionCode,
          sessionName: courseSessions.sessionName,
          courseId: courseSessions.courseId,
          courseName: trainingCourses.courseName,
          startDate: courseSessions.startDate,
          endDate: courseSessions.endDate,
          registrationCount: courseSessions.registrationCount,
          attendeesCount: courseSessions.attendeesCount,
        })
        .from(courseSessions)
        .leftJoin(trainingCourses, eq(courseSessions.courseId, trainingCourses.id))
        .where(eq(courseSessions.id, sessionId))
        .limit(1);

      if (!session || session.length === 0) {
        return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Session not found'
    );
      }

      // Get all registrations for this session with member details
      const registrations = await db
        .select({
          id: courseRegistrations.id,
          memberId: courseRegistrations.memberId,
          firstName: members.firstName,
          lastName: members.lastName,
          email: members.email,
          registrationStatus: courseRegistrations.registrationStatus,
          registrationDate: courseRegistrations.registrationDate,
          attended: courseRegistrations.attended,
          attendanceDates: courseRegistrations.attendanceDates,
          attendanceHours: courseRegistrations.attendanceHours,
          completed: courseRegistrations.completed,
          completionDate: courseRegistrations.completionDate,
          completionPercentage: courseRegistrations.completionPercentage,
        })
        .from(courseRegistrations)
        .leftJoin(members, eq(courseRegistrations.memberId, members.id))
        .where(eq(courseRegistrations.sessionId, sessionId))
        .orderBy(members.lastName, members.firstName);

      logger.info("Attendance records retrieved", {
        sessionId,
        registrationCount: registrations.length,
        attendedCount: registrations.filter((r) => r.attended).length,
      });

      return NextResponse.json({
        session: session[0],
        registrations,
        stats: {
          total: registrations.length,
          attended: registrations.filter((r) => r.attended).length,
          notAttended: registrations.filter((r) => !r.attended).length,
          completed: registrations.filter((r) => r.completed).length,
        },
      });
    } catch (error) {
      logger.error("Error retrieving attendance records", { error });
      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to retrieve attendance records',
      error
    );
    }
    })(request, { params });
};

// POST /api/education/sessions/[id]/attendance - Mark attendance (single or bulk)

const educationSessionsAttendanceSchema = z.object({
  registrationIds: z.string().uuid('Invalid registrationIds'),
  memberId: z.string().uuid('Invalid memberId'),
  attended: z.unknown().optional(),
  attendanceDate: z.string().datetime().optional(),
  attendanceHours: z.unknown().optional(),
  registrationId: z.string().uuid('Invalid registrationId'),
  attendanceDates: z.string().datetime().optional(),
});

export const POST = async (request: NextRequest, { params }: { params: { id: string } }) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
  try {
      const sessionId = params.id;
      const body = await request.json();
    // Validate request body
    const validation = educationSessionsAttendanceSchema.safeParse(body);
    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request data',
        validation.error.errors
      );
    }
    
    const { registrationIds, memberId, attended, attendanceDate, attendanceHours, registrationId, attendanceDates } = validation.data;
      const { registrationIds, memberId, attended, attendanceDate, attendanceHours } = body;

      if (!sessionId) {
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Session ID is required'
    );
      }

      // Verify session exists
      const session = await db
        .select()
        .from(courseSessions)
        .where(eq(courseSessions.id, sessionId))
        .limit(1);

      if (!session || session.length === 0) {
        return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Session not found'
    );
      }

      const attendanceDateValue = attendanceDate ? new Date(attendanceDate) : new Date();

      // Bulk attendance marking
      if (registrationIds && Array.isArray(registrationIds) && registrationIds.length > 0) {
        const updatePromises = registrationIds.map(async (regId: string) => {
          // Get current registration
          const [registration] = await db
            .select()
            .from(courseRegistrations)
            .where(eq(courseRegistrations.id, regId))
            .limit(1);

          if (!registration) return null;

          // Build attendance dates array
          const currentDates = (registration.attendanceDates as Array<Record<string, unknown>>) || [];
          const updatedDates = attended
            ? [...currentDates, attendanceDateValue.toISOString()]
            : currentDates;

          // Update registration
          return db
            .update(courseRegistrations)
            .set({
              attended: attended !== undefined ? attended : registration.attended,
              attendanceDates: updatedDates,
              attendanceHours:
                attendanceHours !== undefined
                  ? attendanceHours?.toString()
                  : registration.attendanceHours,
              registrationStatus: attended ? "attended" : registration.registrationStatus,
              updatedAt: new Date().toISOString(),
            })
            .where(eq(courseRegistrations.id, regId))
            .returning();
        });

        const results = await Promise.all(updatePromises);
        const successCount = results.filter((r) => r !== null).length;

        // Update session attended count
        const attendedCount = await db
          .select()
          .from(courseRegistrations)
          .where(
            and(
              eq(courseRegistrations.sessionId, sessionId),
              eq(courseRegistrations.attended, true)
            )
          );

        await db
          .update(courseSessions)
          .set({
            attendeesCount: attendedCount.length,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(courseSessions.id, sessionId));

        logger.info("Bulk attendance marked", {
          sessionId,
          registrationCount: registrationIds.length,
          successCount,
          attended,
        });

        return NextResponse.json({
          message: `Attendance marked for ${successCount} registrations`,
          successCount,
          totalCount: registrationIds.length,
        });
      }

      // Single attendance marking
      if (memberId) {
        const [registration] = await db
          .select()
          .from(courseRegistrations)
          .where(
            and(
              eq(courseRegistrations.sessionId, sessionId),
              eq(courseRegistrations.memberId, memberId)
            )
          )
          .limit(1);

        if (!registration) {
          return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Registration not found for this member and session'
    );
        }

        // Build attendance dates array
        const currentDates = (registration.attendanceDates as Array<Record<string, unknown>>) || [];
        const updatedDates = attended
          ? [...currentDates, attendanceDateValue.toISOString()]
          : currentDates;

        const [updatedRegistration] = await db
          .update(courseRegistrations)
          .set({
            attended: attended !== undefined ? attended : registration.attended,
            attendanceDates: updatedDates,
            attendanceHours:
              attendanceHours !== undefined ? attendanceHours : registration.attendanceHours,
            registrationStatus: attended ? "attended" : registration.registrationStatus,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(courseRegistrations.id, registration.id))
          .returning();

        // Update session attended count
        const attendedCount = await db
          .select()
          .from(courseRegistrations)
          .where(
            and(
              eq(courseRegistrations.sessionId, sessionId),
              eq(courseRegistrations.attended, true)
            )
          );

        await db
          .update(courseSessions)
          .set({
            attendeesCount: attendedCount.length,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(courseSessions.id, sessionId));

        logger.info("Attendance marked", {
          sessionId,
          memberId,
          registrationId: registration.id,
          attended,
        });

        return NextResponse.json({
          message: "Attendance marked successfully",
          registration: updatedRegistration,
        });
      }

      return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Either registrationIds or memberId is required'
    );
    } catch (error) {
      logger.error("Error marking attendance", { error });
      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to mark attendance',
      error
    );
    }
    })(request, { params });
};

// PATCH /api/education/sessions/[id]/attendance - Update attendance record
export const PATCH = async (request: NextRequest, { params }: { params: { id: string } }) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
  try {
      const sessionId = params.id;
      const body = await request.json();
      const { registrationId, attended, attendanceHours, attendanceDates } = body;

      if (!registrationId) {
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Registration ID is required'
    );
      }

      // Build update object
      const updateData = {
        updatedAt: new Date().toISOString(),
      };

      if (attended !== undefined) updateData.attended = attended;
      if (attendanceHours !== undefined) updateData.attendanceHours = attendanceHours;
      if (attendanceDates !== undefined) updateData.attendanceDates = attendanceDates;
      if (attended !== undefined && attended) {
        updateData.registrationStatus = "attended";
      }

      const [updatedRegistration] = await db
        .update(courseRegistrations)
        .set(updateData)
        .where(
          and(
            eq(courseRegistrations.id, registrationId),
            eq(courseRegistrations.sessionId, sessionId)
          )
        )
        .returning();

      if (!updatedRegistration) {
        return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Registration not found'
    );
      }

      // Update session attended count
      const attendedCount = await db
        .select()
        .from(courseRegistrations)
        .where(
          and(
            eq(courseRegistrations.sessionId, sessionId),
            eq(courseRegistrations.attended, true)
          )
        );

      await db
        .update(courseSessions)
        .set({
          attendeesCount: attendedCount.length,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(courseSessions.id, sessionId));

      logger.info("Attendance updated", {
        sessionId,
        registrationId,
        updates: Object.keys(updateData),
      });

      return NextResponse.json({
        message: "Attendance updated successfully",
        registration: updatedRegistration,
      });
    } catch (error) {
      logger.error("Error updating attendance", { error });
      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to update attendance',
      error
    );
    }
    })(request, { params });
};
