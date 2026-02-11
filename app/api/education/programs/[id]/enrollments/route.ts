import { withRLSContext } from '@/lib/db/with-rls-context';
import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  programEnrollments,
  trainingPrograms,
  members,
  courseRegistrations,
  trainingCourses,
} from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { sendProgramMilestone } from "@/lib/email/training-notifications";
import { z } from "zod";
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
// GET /api/education/programs/[id]/enrollments - List program enrollments
export const GET = async (request: NextRequest, { params }: { params: { id: string } }) => {
  return withRoleAuth(10, async (request, context) => {
  try {
      const programId = params.id;
      const { searchParams } = new URL(request.url);
      const enrollmentStatus = searchParams.get("enrollmentStatus");
      const includeProgress = searchParams.get("includeProgress") === "true";

      // Verify program exists
      const [program] = await db
        .select()
        .from(trainingPrograms)
        .where(eq(trainingPrograms.id, programId));

      if (!program) {
        return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Program not found'
    );
      }

      // Build WHERE conditions
      const conditions = [eq(programEnrollments.programId, programId)];

      if (enrollmentStatus) {
        conditions.push(
          eq(programEnrollments.enrollmentStatus, enrollmentStatus as any)
        );
      }

      // Query enrollments with member details
      const enrollments = await db
        .select({
          id: programEnrollments.id,
          programId: programEnrollments.programId,
          memberId: programEnrollments.memberId,
          firstName: members.firstName,
          lastName: members.lastName,
          email: members.email,
          enrollmentDate: programEnrollments.enrollmentDate,
          enrollmentStatus: programEnrollments.enrollmentStatus,
          expectedCompletionDate: programEnrollments.expectedCompletionDate,
          completionDate: programEnrollments.completionDate,
          progressPercentage: programEnrollments.progressPercentage,
          completed: programEnrollments.completed,
          certificationIssued: programEnrollments.certificationIssued,
          certificationId: programEnrollments.certificationId,
          hoursCompleted: programEnrollments.hoursCompleted,
          hoursRequired: programEnrollments.hoursRequired,
          coursesCompleted: programEnrollments.coursesCompleted,
          coursesRequired: programEnrollments.coursesRequired,
          extensionGranted: programEnrollments.extensionGranted,
          extendedCompletionDate: programEnrollments.extendedCompletionDate,
          notes: programEnrollments.notes,
          createdAt: programEnrollments.createdAt,
          updatedAt: programEnrollments.updatedAt,
        })
        .from(programEnrollments)
        .leftJoin(members, eq(programEnrollments.memberId, members.id))
        .where(and(...conditions))
        .orderBy(programEnrollments.enrollmentDate);

      // If includeProgress is true, fetch detailed progress for each enrollment
      let enrichedEnrollments = enrollments;
      if (includeProgress) {
        enrichedEnrollments = await Promise.all(
          enrollments.map(async (enrollment) => {
            // Get completed courses for this member in this program
            const completedCourses = await withRLSContext(async (tx) => {
      return await tx.execute(sql`
            SELECT 
              cr.id as registration_id,
              tc.id as course_id,
              tc.course_name,
              tc.course_code,
              cr.completion_date,
              cr.final_grade,
              cr.attendance_hours
            FROM course_registrations cr
            INNER JOIN training_courses tc ON cr.course_id = tc.id
            WHERE cr.member_id = ${enrollment.memberId}
              AND cr.completed = true
              AND tc.id = ANY(${program.requiredCourses || []})
            ORDER BY cr.completion_date DESC
          `);
    });

            // Calculate progress metrics
            const requiredCoursesArray = Array.isArray(program.requiredCourses) ? program.requiredCourses : [];
            const totalRequiredCourses = requiredCoursesArray.length;
            const coursesCompletedCount = completedCourses.length;
            const progressPercentage =
              totalRequiredCourses > 0
                ? Math.round((coursesCompletedCount / totalRequiredCourses) * 100)
                : 0;

            return {
              ...enrollment,
              progress: {
                completedCourses: completedCourses.map((c: any) => ({
                  registrationId: c.registration_id,
                  courseId: c.course_id,
                  courseName: c.course_name,
                  courseCode: c.course_code,
                  completionDate: c.completion_date,
                  finalGrade: c.final_grade,
                  attendanceHours: c.attendance_hours,
                })),
                totalRequiredCourses,
                coursesCompletedCount,
                progressPercentage,
                remainingCourses: Math.max(
                  0,
                  totalRequiredCourses - coursesCompletedCount
                ),
              },
            };
          })
        );
      }

      // Calculate statistics
      const stats = {
        total: enrollments.length,
        active: enrollments.filter((e) => e.enrollmentStatus === "active").length,
        completed: enrollments.filter((e) => e.enrollmentStatus === "completed")
          .length,
        suspended: enrollments.filter((e) => e.enrollmentStatus === "suspended")
          .length,
        withdrawn: enrollments.filter((e) => e.enrollmentStatus === "withdrawn")
          .length,
        avgCompletionPercentage:
          enrollments.length > 0
            ? Math.round(
                enrollments.reduce(
                  (sum, e) => sum + (Number(e.progressPercentage) || 0),
                  0
                ) / enrollments.length
              )
            : 0,
      };

      logger.info("Program enrollments retrieved", {
        programId,
        count: enrichedEnrollments.length,
        includeProgress,
      });

      return NextResponse.json({
        enrollments: enrichedEnrollments,
        stats,
        program: {
          id: program.id,
          programName: program.programName,
          programCode: program.programCode,
          programCategory: program.programCategory,
          requiredCourses: program.requiredCourses,
        },
      });
    } catch (error) {
      logger.error("Error retrieving program enrollments", { error });
      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to retrieve program enrollments',
      error
    );
    }
    })(request, { params });
};

// POST /api/education/programs/[id]/enrollments - Enroll member in program

const educationProgramsEnrollmentsSchema = z.object({
  memberId: z.string().uuid('Invalid memberId'),
  startDate: z.string().datetime().optional(),
  expectedCompletionDate: z.string().datetime().optional(),
  mentorId: z.string().uuid('Invalid mentorId'),
  currentLevel: z.unknown().optional(),
  enrollmentStatus: z.unknown().optional(),
  completionPercentage: z.unknown().optional(),
  hoursCompleted: z.unknown().optional(),
  coursesCompleted: z.unknown().optional(),
  actualCompletionDate: z.string().datetime().optional(),
  withdrawalReason: z.unknown().optional(),
  notes: z.string().optional(),
});

export const POST = async (request: NextRequest, { params }: { params: { id: string } }) => {
  return withRoleAuth(20, async (request, context) => {
  try {
      const programId = params.id;
      const body = await request.json();
    // Validate request body
    const validation = educationProgramsEnrollmentsSchema.safeParse(body);
    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request data',
        validation.error.errors
      );
    }
    
    const { memberId, startDate, expectedCompletionDate, mentorId, currentLevel, enrollmentStatus, completionPercentage, hoursCompleted, coursesCompleted, actualCompletionDate, withdrawalReason, notes } = validation.data;
      const {
        memberId,
        startDate,
        expectedCompletionDate,
        mentorId,
        currentLevel,
      } = body;

      // Validate required fields
      if (!memberId) {
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'memberId is required'
    );
      }

      // Verify program exists and is active
      const [program] = await db
        .select()
        .from(trainingPrograms)
        .where(eq(trainingPrograms.id, programId));

      if (!program) {
        return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Program not found'
    );
      }

      if (!program.isActive) {
        return NextResponse.json(
          { error: "Cannot enroll in inactive program" },
          { status: 400 }
        );
      }

      // Check for existing enrollment
      const [existingEnrollment] = await db
        .select()
        .from(programEnrollments)
        .where(
          and(
            eq(programEnrollments.programId, programId),
            eq(programEnrollments.memberId, memberId)
          )
        );

      if (existingEnrollment && existingEnrollment.enrollmentStatus === "active") {
        return NextResponse.json(
          { error: "Member is already enrolled in this program" },
          { status: 400 }
        );
      }

      // Parse requiredCourses as array for length calculation
      const requiredCoursesArray = Array.isArray(program.requiredCourses) ? program.requiredCourses : [];

      // Create enrollment
      const [newEnrollment] = await db
        .insert(programEnrollments)
        .values({
          organizationId: program.organizationId,
          programId,
          memberId,
          enrollmentDate: new Date().toISOString().split('T')[0],
          enrollmentStatus: "active",
          expectedCompletionDate: expectedCompletionDate
            ? new Date(expectedCompletionDate).toISOString().split('T')[0]
            : null,
          progressPercentage: "0",
          hoursCompleted: "0",
          hoursRequired: program.totalHoursRequired?.toString() || null,
          coursesCompleted: 0,
          coursesRequired: requiredCoursesArray.length || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .returning();

      logger.info("Member enrolled in program", {
        enrollmentId: newEnrollment.id,
        programId,
        memberId,
      });

      return standardSuccessResponse(
      { 
          enrollment: newEnrollment,
          message: "Member enrolled successfully",
         },
      undefined,
      201
    );
    } catch (error) {
      logger.error("Error enrolling member in program", { error });
      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to enroll member in program',
      error
    );
    }
    })(request, { params });
};

// PATCH /api/education/programs/[id]/enrollments?enrollmentId={id} - Update enrollment
export const PATCH = async (request: NextRequest, { params }: { params: { id: string } }) => {
  return withRoleAuth(20, async (request, context) => {
  try {
      const { searchParams } = new URL(request.url);
      const enrollmentId = searchParams.get("enrollmentId");

      if (!enrollmentId) {
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'enrollmentId is required'
    );
      }

      const body = await request.json();
      const {
        enrollmentStatus,
        completionPercentage,
        currentLevel,
        mentorId,
        hoursCompleted,
        coursesCompleted,
        actualCompletionDate,
        withdrawalReason,
        notes,
      } = body;

      // Build update object
      const updateData: any = {
        lastProgressUpdate: new Date(),
        updatedAt: new Date(),
      };

      if (enrollmentStatus !== undefined) {
        updateData.enrollmentStatus = enrollmentStatus;

        // Handle completion
        if (enrollmentStatus === "completed") {
          updateData.actualCompletionDate = actualCompletionDate
            ? new Date(actualCompletionDate)
            : new Date();
          updateData.completionPercentage = 100;
        }

        // Handle withdrawal
        if (enrollmentStatus === "withdrawn") {
          updateData.withdrawalDate = new Date();
          updateData.withdrawalReason = withdrawalReason || "Not specified";
        }
      }

      if (completionPercentage !== undefined)
        updateData.completionPercentage = completionPercentage;
      if (currentLevel !== undefined) updateData.currentLevel = currentLevel;
      if (mentorId !== undefined) updateData.mentorId = mentorId;
      if (hoursCompleted !== undefined) updateData.hoursCompleted = hoursCompleted;
      if (coursesCompleted !== undefined)
        updateData.coursesCompleted = coursesCompleted;
      if (notes !== undefined) updateData.notes = notes;

      const [updatedEnrollment] = await db
        .update(programEnrollments)
        .set(updateData)
        .where(eq(programEnrollments.id, enrollmentId))
        .returning();

      if (!updatedEnrollment) {
        return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Enrollment not found'
    );
      }

      // Send milestone email if enrollment completed (non-blocking)
      if (enrollmentStatus === "completed") {
        const [enrollmentWithDetails] = await db
          .select({
            memberEmail: members.email,
            memberFirstName: members.firstName,
            memberLastName: members.lastName,
            programName: trainingPrograms.programName,
            progressPercentage: programEnrollments.progressPercentage,
            coursesCompleted: programEnrollments.coursesCompleted,
            coursesRequired: programEnrollments.coursesRequired,
            hoursCompleted: programEnrollments.hoursCompleted,
            hoursRequired: programEnrollments.hoursRequired,
          })
          .from(programEnrollments)
          .innerJoin(members, eq(members.id, programEnrollments.memberId))
          .innerJoin(trainingPrograms, eq(trainingPrograms.id, programEnrollments.programId))
          .where(eq(programEnrollments.id, enrollmentId));

        if (enrollmentWithDetails && enrollmentWithDetails.memberEmail) {
          const data = enrollmentWithDetails;

          sendProgramMilestone({
            toEmail: data.memberEmail!,
            memberName: `${data.memberFirstName || ''} ${data.memberLastName || ''}`.trim(),
            programName: data.programName,
            milestoneTitle: "Program Completed!",
            completionPercentage: Number(data.progressPercentage) || 0,
            coursesCompleted: data.coursesCompleted || 0,
            coursesRequired: data.coursesRequired || 0,
            hoursCompleted: Number(data.hoursCompleted) || 0,
            hoursRequired: Number(data.hoursRequired) || 0,
            achievementDate: new Date().toLocaleDateString(),
          }).catch(err => logger.error('Failed to send milestone email', err));
        }
      }

      logger.info("Program enrollment updated", {
        enrollmentId,
        updates: Object.keys(updateData),
      });

      return NextResponse.json({
        enrollment: updatedEnrollment,
        message: "Enrollment updated successfully",
      });
    } catch (error) {
      logger.error("Error updating program enrollment", { error });
      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to update enrollment',
      error
    );
    }
    })(request, { params });
};
