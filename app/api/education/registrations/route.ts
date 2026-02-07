import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * API Route: Course Registrations
 * Member course enrollments and registration management
 * Phase 3: Education & Training
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { sql } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { sendRegistrationConfirmation } from '@/lib/email/training-notifications';
import { z } from "zod";
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";

export const dynamic = 'force-dynamic';

export const GET = async (request: NextRequest) => {
  return withEnhancedRoleAuth(10, async (request, context) => {
    const user = { id: context.userId, organizationId: context.organizationId };

  try {
      const { searchParams } = new URL(request.url);
      const memberId = searchParams.get('memberId');
      const sessionId = searchParams.get('sessionId');
      const registrationStatus = searchParams.get('registrationStatus');

      if (!memberId && !sessionId) {
        return NextResponse.json(
          { error: 'Bad Request - Either memberId or sessionId is required' },
          { status: 400 }
        );
      }

      // Build query with joins to get course and session details
      const conditions: any[] = [];

      if (memberId) {
        conditions.push(sql`cr.member_id = ${memberId}`);
      }

      if (sessionId) {
        conditions.push(sql`cr.session_id = ${sessionId}`);
      }

      if (registrationStatus) {
        conditions.push(sql`cr.registration_status = ${registrationStatus}`);
      }

      const whereClause = conditions.length > 0 
        ? sql.join(conditions, sql.raw(' AND '))
        : sql`1=1`;

      const result = await db.execute(sql`
      SELECT 
        cr.id,
        cr.member_id,
        cr.course_id,
        cr.session_id,
        cr.registration_date,
        cr.registration_status,
        cr.attended,
        cr.completed,
        cr.completion_date,
        cr.completion_percentage,
        cr.passed,
        cr.certificate_issued,
        cr.certificate_number,
        cr.certificate_url,
        tc.course_name,
        tc.course_code,
        tc.course_category,
        tc.delivery_method,
        cs.session_code,
        cs.start_date,
        cs.end_date,
        cs.venue_name,
        m.first_name,
        m.last_name,
        m.member_number
      FROM course_registrations cr
      INNER JOIN training_courses tc ON cr.course_id = tc.id
      INNER JOIN course_sessions cs ON cr.session_id = cs.id
      INNER JOIN members m ON cr.member_id = m.id
      WHERE ${whereClause}
      ORDER BY cr.registration_date DESC
    `);

      return NextResponse.json({
        success: true,
        data: result,
        count: result.length,
      });

    } catch (error) {
      logger.error('Failed to fetch course registrations', error as Error, {
        memberId: request.nextUrl.searchParams.get('memberId'),
        sessionId: request.nextUrl.searchParams.get('sessionId'),
        correlationId: request.headers.get('x-correlation-id'),
      });
      return NextResponse.json(
        { error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  })
  })(request);
};

export const POST = async (request: NextRequest) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
    const user = { id: context.userId, organizationId: context.organizationId };

  try {
      const body = await request.json();
      const {
        organizationId,
        memberId,
        courseId,
        sessionId,
        travelRequired,
        travelSubsidyRequested,
        accommodationRequired,
      } = body;
  if (organizationId && organizationId !== context.organizationId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }


      // Validate required fields
      if (!organizationId || !memberId || !courseId || !sessionId) {
        return NextResponse.json(
          { error: 'Bad Request - organizationId, memberId, courseId, and sessionId are required' },
          { status: 400 }
        );
      }

      // Check session capacity
      const capacityCheck = await db.execute(sql`
      SELECT 
        cs.max_enrollment,
        cs.registration_count,
        cs.session_status
      FROM course_sessions cs
      WHERE cs.id = ${sessionId}
    `);

      if (capacityCheck.length === 0) {
        return NextResponse.json(
          { error: 'Not Found - Session not found' },
          { status: 404 }
        );
      }

      const session = capacityCheck[0];
      const isFull = Number(session.registration_count || 0) >= Number(session.max_enrollment || 0);
      const registrationStatus = isFull ? 'waitlisted' : 'registered';

      if (session.session_status === 'cancelled') {
        return NextResponse.json(
          { error: 'Bad Request - Cannot register for cancelled session' },
          { status: 400 }
        );
      }

      // Check for duplicate registration
      const duplicateCheck = await db.execute(sql`
      SELECT id FROM course_registrations
      WHERE member_id = ${memberId} AND session_id = ${sessionId}
    `);

      if (duplicateCheck.length > 0) {
        return NextResponse.json(
          { error: 'Conflict - Member already registered for this session' },
          { status: 409 }
        );
      }

      // Insert registration
      const result = await db.execute(sql`
      INSERT INTO course_registrations (
        id,
        organization_id,
        member_id,
        course_id,
        session_id,
        registration_date,
        registration_status,
        travel_required,
        travel_subsidy_requested,
        accommodation_required,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        ${organizationId}, ${memberId}, ${courseId}, ${sessionId},
        NOW(), ${registrationStatus},
        ${travelRequired !== undefined ? travelRequired : false},
        ${travelSubsidyRequested !== undefined ? travelSubsidyRequested : false},
        ${accommodationRequired !== undefined ? accommodationRequired : false},
        NOW(), NOW()
      )
      RETURNING 
        id, member_id, course_id, session_id, registration_date, registration_status
    `);

      // Update session registration count
      if (registrationStatus === 'registered') {
        await db.execute(sql`
        UPDATE course_sessions
        SET registration_count = registration_count + 1, updated_at = NOW()
        WHERE id = ${sessionId}
      `);
      } else {
        await db.execute(sql`
        UPDATE course_sessions
        SET waitlist_count = waitlist_count + 1, updated_at = NOW()
        WHERE id = ${sessionId}
      `);
      }

      // Send registration confirmation email (non-blocking)
      if (registrationStatus === 'registered') {
        const emailData = await db.execute(sql`
        SELECT 
          m.email, m.first_name, m.last_name,
          c.course_name, c.course_code, c.total_hours,
          cs.session_date, cs.end_date, cs.location,
          i.first_name as instructor_first_name, i.last_name as instructor_last_name
        FROM course_registrations cr
        JOIN members m ON m.id = cr.member_id
        JOIN training_courses c ON c.id = cr.course_id
        JOIN course_sessions cs ON cs.id = cr.session_id
        LEFT JOIN members i ON i.id = cs.lead_instructor_id
        WHERE cr.id = ${result[0].id}
      `) as unknown as Record<string, unknown>[];

        if (emailData.length > 0) {
          const data = emailData[0] as Record<string, unknown>;
          sendRegistrationConfirmation({
            toEmail: data.email as string,
            memberName: `${data.first_name} ${data.last_name}`,
            courseName: data.course_name as string,
            courseCode: data.course_code as string,
            registrationDate: new Date().toLocaleDateString(),
            startDate: data.session_date ? new Date(data.session_date).toLocaleDateString() : undefined,
            endDate: data.end_date ? new Date(data.end_date).toLocaleDateString() : undefined,
            instructorName: data.instructor_first_name ? `${data.instructor_first_name} ${data.instructor_last_name}` : undefined,
            location: data.location as string || undefined,
            totalHours: data.total_hours as number || undefined,
          }).catch(err => logger.error('Failed to send registration confirmation email', err));
        }
      }

      return NextResponse.json({
        success: true,
        data: result[0],
        message: isFull ? 'Added to waitlist successfully' : 'Registration successful',
      }, { status: 201 });

    } catch (error) {
      logger.error('Failed to register for course', error as Error, {
        correlationId: request.headers.get('x-correlation-id'),
      });
      return NextResponse.json(
        { error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  })
  })(request);
};

export const PATCH = async (request: NextRequest) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
    const user = { id: context.userId, organizationId: context.organizationId };

  try {
      const { searchParams } = new URL(request.url);
      const registrationId = searchParams.get('id');

      if (!registrationId) {
        return NextResponse.json(
          { error: 'Bad Request - id parameter is required' },
          { status: 400 }
        );
      }

      const body = await request.json();
      const {
        registrationStatus,
        attended,
        attendanceHours,
      } = body;

      // Build update query
      const updates: any[] = [];

      if (registrationStatus !== undefined) {
        updates.push(sql`registration_status = ${registrationStatus}`);
      }
      if (attended !== undefined) {
        updates.push(sql`attended = ${attended}`);
      }
      if (attendanceHours !== undefined) {
        updates.push(sql`attendance_hours = ${attendanceHours}`);
      }

      if (updates.length === 0) {
        return NextResponse.json(
          { error: 'Bad Request - No fields to update' },
          { status: 400 }
        );
      }

      updates.push(sql`updated_at = NOW()`);
      const setClause = sql.join(updates, sql.raw(', '));

      const result = await db.execute(sql`
      UPDATE course_registrations
      SET ${setClause}
      WHERE id = ${registrationId}
      RETURNING *
    `);

      if (result.length === 0) {
        return NextResponse.json(
          { error: 'Not Found - Registration not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: result[0],
        message: 'Registration updated successfully',
      });

    } catch (error) {
      logger.error('Failed to update registration', error as Error, {
        registrationId: request.nextUrl.searchParams.get('id'),
        correlationId: request.headers.get('x-correlation-id'),
      });
      return NextResponse.json(
        { error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  })
  })(request);
};
