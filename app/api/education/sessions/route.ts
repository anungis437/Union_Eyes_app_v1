import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { NextRequest, NextResponse } from "next/server";
import { NotificationService } from "@/lib/services/notification-service";
import { db } from "@/db";
import { courseSessions, trainingCourses, courseRegistrations } from "@/db/schema";
import { eq, and, gte, lte, inArray, sql } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
// GET /api/education/sessions - List sessions with filters
export const GET = async (request: NextRequest) => {
  return withRoleAuth(10, async (request, context) => {
  try {
      const { searchParams } = new URL(request.url);
      const organizationId = searchParams.get("organizationId");
      const courseId = searchParams.get("courseId");
      const startDate = searchParams.get("startDate");
      const endDate = searchParams.get("endDate");
      const sessionStatus = searchParams.get("sessionStatus");
      const instructorId = searchParams.get("instructorId");

      if (!organizationId) {
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'organizationId is required'
    );
      }

      // Build WHERE conditions
      const conditions = [eq(courseSessions.organizationId, organizationId)];

      if (courseId) {
        conditions.push(eq(courseSessions.courseId, courseId));
      }

      if (startDate) {
        conditions.push(gte(courseSessions.startDate, startDate));
      }

      if (endDate) {
        conditions.push(lte(courseSessions.endDate, endDate));
      }

      if (sessionStatus) {
        conditions.push(eq(courseSessions.sessionStatus, sessionStatus as any));
      }

      // Query sessions with course details and enrollment counts
      const sessions = await db
        .select({
          id: courseSessions.id,
          organizationId: courseSessions.organizationId,
          courseId: courseSessions.courseId,
          courseName: trainingCourses.courseName,
          courseCode: trainingCourses.courseCode,
          sessionCode: courseSessions.sessionCode,
          sessionName: courseSessions.sessionName,
          startDate: courseSessions.startDate,
          endDate: courseSessions.endDate,
          sessionTimes: courseSessions.sessionTimes,
          deliveryMethod: courseSessions.deliveryMethod,
          venueName: courseSessions.venueName,
          venueAddress: courseSessions.venueAddress,
          roomNumber: courseSessions.roomNumber,
          virtualMeetingUrl: courseSessions.virtualMeetingUrl,
          virtualMeetingAccessCode: courseSessions.virtualMeetingAccessCode,
          leadInstructorId: courseSessions.leadInstructorId,
          leadInstructorName: courseSessions.leadInstructorName,
          coInstructors: courseSessions.coInstructors,
          sessionStatus: courseSessions.sessionStatus,
          registrationOpenDate: courseSessions.registrationOpenDate,
          registrationCloseDate: courseSessions.registrationCloseDate,
          maxEnrollment: courseSessions.maxEnrollment,
          registrationCount: courseSessions.registrationCount,
          waitlistCount: courseSessions.waitlistCount,
          attendeesCount: courseSessions.attendeesCount,
          completionsCount: courseSessions.completionsCount,
          cancellationReason: courseSessions.cancellationReason,
          cancelledDate: courseSessions.cancelledDate,
          createdAt: courseSessions.createdAt,
          updatedAt: courseSessions.updatedAt,
        })
        .from(courseSessions)
        .leftJoin(trainingCourses, eq(courseSessions.courseId, trainingCourses.id))
        .where(and(...conditions))
        .orderBy(courseSessions.startDate);

      // Filter by instructor if specified (check lead and co-instructors)
      let filteredSessions = sessions;
      if (instructorId) {
        filteredSessions = sessions.filter((session) => {
          if (session.leadInstructorId === instructorId) return true;
          if (
            session.coInstructors &&
            Array.isArray(session.coInstructors) &&
            (session.coInstructors as string[]).includes(instructorId)
          ) {
            return true;
          }
          return false;
        });
      }

      logger.info("Sessions retrieved", {
        count: filteredSessions.length,
        organizationId,
        courseId,
        instructorId,
      });

      return NextResponse.json({
        sessions: filteredSessions,
        count: filteredSessions.length,
      });
    } catch (error) {
      logger.error("Error retrieving sessions", { error });
      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to retrieve sessions',
      error
    );
    }
    })(request);
};

// POST /api/education/sessions - Create new session

const educationSessionsSchema = z.object({
  organizationId: z.string().uuid('Invalid organizationId'),
  courseId: z.string().uuid('Invalid courseId'),
  sessionCode: z.unknown().optional(),
  sessionName: z.string().min(1, 'sessionName is required'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  sessionTimes: z.string().datetime().optional(),
  deliveryMethod: z.unknown().optional(),
  venueName: z.string().min(1, 'venueName is required'),
  venueAddress: z.unknown().optional(),
  roomNumber: z.unknown().optional(),
  virtualMeetingUrl: z.string().url('Invalid URL'),
  virtualMeetingAccessCode: z.unknown().optional(),
  leadInstructorId: z.string().uuid('Invalid leadInstructorId'),
  leadInstructorName: z.string().min(1, 'leadInstructorName is required'),
  coInstructors: z.unknown().optional(),
  registrationOpenDate: z.boolean().optional(),
  registrationCloseDate: z.boolean().optional(),
  maxEnrollment: z.unknown().optional(),
  sessionBudget: z.unknown().optional(),
  sessionStatus: z.unknown().optional(),
  cancellationReason: z.unknown().optional(),
});

export const POST = async (request: NextRequest) => {
  return withRoleAuth(20, async (request, context) => {
  try {
      const body = await request.json();
    // Validate request body
    const validation = educationSessionsSchema.safeParse(body);
    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request data',
        validation.error.errors
      );
    }
    
      // DUPLICATE REMOVED:     const { organizationId, courseId, sessionCode, sessionName, startDate, endDate, sessionTimes, deliveryMethod, venueName, venueAddress, roomNumber, virtualMeetingUrl, virtualMeetingAccessCode, leadInstructorId, leadInstructorName, coInstructors, registrationOpenDate, registrationCloseDate, maxEnrollment, sessionBudget, sessionStatus, cancellationReason } = validation.data;
      const {
        organizationId,
        courseId,
        sessionCode,
        sessionName,
        startDate,
        endDate,
        sessionTimes,
        deliveryMethod,
        venueName,
        venueAddress,
        roomNumber,
        virtualMeetingUrl,
        virtualMeetingAccessCode,
        leadInstructorId,
        leadInstructorName,
        coInstructors,
        registrationOpenDate,
        registrationCloseDate,
        maxEnrollment,
        sessionBudget,
      } = body;
  if (organizationId && organizationId !== context.organizationId) {
    return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Forbidden'
    );
  }


      // Validate required fields
      if (!organizationId || !courseId || !startDate || !endDate) {
        return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Missing required fields: organizationId, courseId, startDate, endDate'
      // TODO: Migrate additional details: courseId, startDate, endDate"
    );
      }

      // Verify course exists
      const course = await db
        .select()
        .from(trainingCourses)
        .where(
          and(
            eq(trainingCourses.id, courseId),
            eq(trainingCourses.organizationId, organizationId)
          )
        )
        .limit(1);

      if (!course || course.length === 0) {
        return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Course not found'
    );
      }

      // Auto-generate session code if not provided
      const generatedSessionCode =
        sessionCode || `SES-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      // Create session
      const [newSession] = await db
        .insert(courseSessions)
        .values({
          organizationId,
          courseId,
          sessionCode: generatedSessionCode,
          sessionName: sessionName || `${course[0].courseName} - ${new Date(startDate).toLocaleDateString()}`,
          startDate: new Date(startDate).toISOString().split('T')[0],
          endDate: new Date(endDate).toISOString().split('T')[0],
          sessionTimes: sessionTimes || null,
          deliveryMethod: deliveryMethod || course[0].deliveryMethod,
          venueName: venueName || null,
          venueAddress: venueAddress || null,
          roomNumber: roomNumber || null,
          virtualMeetingUrl: virtualMeetingUrl || null,
          virtualMeetingAccessCode: virtualMeetingAccessCode || null,
          leadInstructorId: leadInstructorId || null,
          leadInstructorName: leadInstructorName || null,
          coInstructors: coInstructors || null,
          sessionStatus: "scheduled",
          registrationOpenDate: registrationOpenDate ? new Date(registrationOpenDate).toISOString().split('T')[0] : null,
          registrationCloseDate: registrationCloseDate ? new Date(registrationCloseDate).toISOString().split('T')[0] : null,
          maxEnrollment: maxEnrollment || course[0].maxEnrollment || null,
          registrationCount: 0,
          waitlistCount: 0,
          attendeesCount: 0,
          completionsCount: 0,
          sessionBudget: sessionBudget || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .returning();

      logger.info("Session created", {
        sessionId: newSession.id,
        sessionCode: generatedSessionCode,
        courseId,
        organizationId,
      });

      return standardSuccessResponse(
      { 
          session: newSession,
          message: "Session created successfully",
         },
      undefined,
      201
    );
    } catch (error) {
      logger.error("Error creating session", { error });
      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to create session',
      error
    );
    }
    })(request);
};

// PATCH /api/education/sessions?id={sessionId} - Update session
export const PATCH = async (request: NextRequest) => {
  return withRoleAuth(20, async (request, context) => {
  try {
      const { searchParams } = new URL(request.url);
      const sessionId = searchParams.get("id");

      if (!sessionId) {
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Session ID is required'
    );
      }

      const body = await request.json();
      const {
        sessionName,
        startDate,
        endDate,
        sessionTimes,
        deliveryMethod,
        venueName,
        venueAddress,
        roomNumber,
        virtualMeetingUrl,
        virtualMeetingAccessCode,
        leadInstructorId,
        leadInstructorName,
        coInstructors,
        sessionStatus,
        registrationOpenDate,
        registrationCloseDate,
        maxEnrollment,
        sessionBudget,
        cancellationReason,
      } = body;

      // Build update object
      const updateData: any = {
        updatedAt: new Date().toISOString(),
      };

      if (sessionName !== undefined) updateData.sessionName = sessionName;
      if (startDate !== undefined) updateData.startDate = new Date(startDate).toISOString().split('T')[0];
      if (endDate !== undefined) updateData.endDate = new Date(endDate).toISOString().split('T')[0];
      if (sessionTimes !== undefined) updateData.sessionTimes = sessionTimes;
      if (deliveryMethod !== undefined) updateData.deliveryMethod = deliveryMethod;
      if (venueName !== undefined) updateData.venueName = venueName;
      if (venueAddress !== undefined) updateData.venueAddress = venueAddress;
      if (roomNumber !== undefined) updateData.roomNumber = roomNumber;
      if (virtualMeetingUrl !== undefined) updateData.virtualMeetingUrl = virtualMeetingUrl;
      if (virtualMeetingAccessCode !== undefined) updateData.virtualMeetingAccessCode = virtualMeetingAccessCode;
      if (leadInstructorId !== undefined) updateData.leadInstructorId = leadInstructorId;
      if (leadInstructorName !== undefined) updateData.leadInstructorName = leadInstructorName;
      if (coInstructors !== undefined) updateData.coInstructors = coInstructors;
      if (sessionStatus !== undefined) updateData.sessionStatus = sessionStatus;
      if (registrationOpenDate !== undefined) updateData.registrationOpenDate = new Date(registrationOpenDate).toISOString().split('T')[0];
      if (registrationCloseDate !== undefined) updateData.registrationCloseDate = new Date(registrationCloseDate).toISOString().split('T')[0];
      if (maxEnrollment !== undefined) updateData.maxEnrollment = maxEnrollment;
      if (sessionBudget !== undefined) updateData.sessionBudget = sessionBudget;

      // Handle cancellation
      if (sessionStatus === "cancelled") {
        updateData.cancelledDate = new Date().toISOString().split('T')[0];
        if (cancellationReason) {
          updateData.cancellationReason = cancellationReason;
        }
      }

      const [updatedSession] = await db
        .update(courseSessions)
        .set(updateData)
        .where(eq(courseSessions.id, sessionId))
        .returning();

      if (!updatedSession) {
        return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Session not found'
    );
      }

      logger.info("Session updated", {
        sessionId,
        updates: Object.keys(updateData),
      });

      return NextResponse.json({
        session: updatedSession,
        message: "Session updated successfully",
      });
    } catch (error) {
      logger.error("Error updating session", { error });
      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to update session',
      error
    );
    }
    })(request);
};

// DELETE /api/education/sessions?id={sessionId} - Cancel session
export const DELETE = async (request: NextRequest) => {
  return withRoleAuth(20, async (request, context) => {
  try {
      const { searchParams } = new URL(request.url);
      const sessionId = searchParams.get("id");
      const cancellationReason = searchParams.get("reason");

      if (!sessionId) {
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Session ID is required'
    );
      }

      // Mark session as cancelled (soft delete)
      const [cancelledSession] = await db
        .update(courseSessions)
        .set({
          sessionStatus: "cancelled",
          cancellationReason: cancellationReason || "Session cancelled by administrator",
          cancelledDate: new Date().toISOString().split('T')[0],
          updatedAt: new Date().toISOString(),
        })
        .where(eq(courseSessions.id, sessionId))
        .returning();

      if (!cancelledSession) {
        return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Session not found'
    );
      }

      // Send cancellation notifications to enrolled members
      try {
        const enrollments = await db
          .select({
            memberId: courseRegistrations.memberId,
            memberEmail: courseRegistrations.memberEmail,
            memberName: courseRegistrations.memberName,
          })
          .from(courseRegistrations)
          .where(
            and(
              eq(courseRegistrations.sessionId, sessionId),
              inArray(courseRegistrations.registrationStatus, ['registered', 'confirmed'])
            )
          );
        
        if (enrollments.length > 0) {
          const notificationService = new NotificationService();
          
          for (const enrollment of enrollments) {
            if (enrollment.memberEmail) {
              await notificationService.send({
                organizationId: cancelledSession.organizationId,
                recipientId: enrollment.memberId,
                recipientEmail: enrollment.memberEmail,
                type: 'email',
                priority: 'high',
                subject: `Education Session Cancelled: ${cancelledSession.sessionName || cancelledSession.sessionCode}`,
                body: `The education session "${cancelledSession.sessionName || cancelledSession.sessionCode}" has been cancelled.\n\nOriginal Date: ${cancelledSession.startDate}${cancellationReason ? `\nReason: ${cancellationReason}` : ''}\n\nWe apologize for any inconvenience. Please contact us if you have any questions.`,
                htmlBody: `
                  <h2>Education Session Cancelled</h2>
                  <p>The following education session has been cancelled:</p>
                  <ul>
                    <li><strong>Session:</strong> ${cancelledSession.sessionName || cancelledSession.sessionCode}</li>
                    <li><strong>Original Date:</strong> ${cancelledSession.startDate}</li>
                    ${cancelledSession.venueName ? `<li><strong>Location:</strong> ${cancelledSession.venueName}</li>` : ''}
                    ${cancellationReason ? `<li><strong>Reason:</strong> ${cancellationReason}</li>` : ''}
                  </ul>
                  <p>We apologize for any inconvenience. Please contact us if you have any questions.</p>
                `,
                metadata: {
                  sessionId,
                  sessionCode: cancelledSession.sessionCode,
                  cancellationReason,
                },
              });
            }
          }
          
          logger.info(`Sent ${enrollments.length} cancellation notifications for session ${sessionId}`);
        }
      } catch (notificationError) {
        logger.error('Failed to send session cancellation notifications', { error: notificationError });
        // Don't fail the cancellation if notifications fail
      }

      logger.info("Session cancelled", {
        sessionId,
        reason: cancellationReason,
      });

      return NextResponse.json({
        message: "Session cancelled successfully",
        session: cancelledSession,
      });
    } catch (error) {
      logger.error("Error cancelling session", { error });
      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to cancel session',
      error
    );
    }
    })(request);
};

