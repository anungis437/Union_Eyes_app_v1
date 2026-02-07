import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { courseSessions, trainingCourses, courseRegistrations } from "@/db/migrations/schema";
import { eq, and, gte, lte, inArray, sql } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";

// GET /api/education/sessions - List sessions with filters
export const GET = async (request: NextRequest) => {
  return withEnhancedRoleAuth(10, async (request, context) => {
    const user = { id: context.userId, organizationId: context.organizationId };

  try {
      const { searchParams } = new URL(request.url);
      const organizationId = searchParams.get("organizationId");
      const courseId = searchParams.get("courseId");
      const startDate = searchParams.get("startDate");
      const endDate = searchParams.get("endDate");
      const sessionStatus = searchParams.get("sessionStatus");
      const instructorId = searchParams.get("instructorId");

      if (!organizationId) {
        return NextResponse.json(
          { error: "organizationId is required" },
          { status: 400 }
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
      return NextResponse.json(
        { error: "Failed to retrieve sessions" },
        { status: 500 }
      );
    }
  })
  })(request);
};

// POST /api/education/sessions - Create new session
export const POST = async (request: NextRequest) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
    const user = { id: context.userId, organizationId: context.organizationId };

  try {
      const body = await request.json();
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
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }


      // Validate required fields
      if (!organizationId || !courseId || !startDate || !endDate) {
        return NextResponse.json(
          { error: "Missing required fields: organizationId, courseId, startDate, endDate" },
          { status: 400 }
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
        return NextResponse.json({ error: "Course not found" }, { status: 404 });
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

      return NextResponse.json(
        {
          session: newSession,
          message: "Session created successfully",
        },
        { status: 201 }
      );
    } catch (error) {
      logger.error("Error creating session", { error });
      return NextResponse.json(
        { error: "Failed to create session" },
        { status: 500 }
      );
    }
  })
  })(request);
};

// PATCH /api/education/sessions?id={sessionId} - Update session
export const PATCH = async (request: NextRequest) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
    const user = { id: context.userId, organizationId: context.organizationId };

  try {
      const { searchParams } = new URL(request.url);
      const sessionId = searchParams.get("id");

      if (!sessionId) {
        return NextResponse.json({ error: "Session ID is required" }, { status: 400 });
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
        return NextResponse.json({ error: "Session not found" }, { status: 404 });
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
      return NextResponse.json(
        { error: "Failed to update session" },
        { status: 500 }
      );
    }
  })
  })(request);
};

// DELETE /api/education/sessions?id={sessionId} - Cancel session
export const DELETE = async (request: NextRequest) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
    const user = { id: context.userId, organizationId: context.organizationId };

  try {
      const { searchParams } = new URL(request.url);
      const sessionId = searchParams.get("id");
      const cancellationReason = searchParams.get("reason");

      if (!sessionId) {
        return NextResponse.json({ error: "Session ID is required" }, { status: 400 });
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
        return NextResponse.json({ error: "Session not found" }, { status: 404 });
      }

      // TODO: Send cancellation notifications to enrolled members

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
      return NextResponse.json(
        { error: "Failed to cancel session" },
        { status: 500 }
      );
    }
  })
  })(request);
};
