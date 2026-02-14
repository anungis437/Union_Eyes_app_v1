import { withRLSContext } from '@/lib/db/with-rls-context';
import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * API Route: Training Courses
 * Course catalog management and course listings
 * Phase 3: Education & Training
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { logger } from '@/lib/logger';
import { z } from "zod";
import { withApiAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';

import { standardSuccessResponse } from '@/lib/api/standardized-responses';
export const dynamic = 'force-dynamic';

export const GET = async (request: NextRequest) => {
  return withRoleAuth(10, async (request, context) => {
  try {
      const { searchParams } = new URL(request.url);
      const organizationId = searchParams.get('organizationId');
      const courseCategory = searchParams.get('courseCategory');
      const deliveryMethod = searchParams.get('deliveryMethod');
      const courseDifficulty = searchParams.get('courseDifficulty');
      const clcApproved = searchParams.get('clcApproved');
      const search = searchParams.get('search');

      if (!organizationId) {
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Bad Request - organizationId is required'
    );
      }

      // Build query
      const conditions = [sql`organization_id = ${organizationId}`, sql`is_active = true`];

      if (courseCategory) {
        conditions.push(sql`course_category = ${courseCategory}`);
      }

      if (deliveryMethod) {
        conditions.push(sql`delivery_method = ${deliveryMethod}`);
      }

      if (courseDifficulty) {
        conditions.push(sql`course_difficulty = ${courseDifficulty}`);
      }

      if (clcApproved !== null && clcApproved !== undefined) {
        conditions.push(sql`clc_approved = ${clcApproved === 'true'}`);
      }

      if (search) {
        const searchPattern = `%${search}%`;
        conditions.push(sql`(course_name ILIKE ${searchPattern} OR course_description ILIKE ${searchPattern})`);
      }

      const whereClause = sql.join(conditions, sql.raw(' AND '));

      const result = await withRLSContext(async (tx) => {
      return await tx.execute(sql`
      SELECT 
        id,
        course_code,
        course_name,
        course_description,
        course_category,
        delivery_method,
        course_difficulty,
        duration_hours,
        duration_days,
        has_prerequisites,
        prerequisite_courses,
        learning_objectives,
        provides_certification,
        certification_name,
        certification_valid_years,
        clc_approved,
        clc_course_code,
        course_fee,
        min_enrollment,
        max_enrollment,
        is_active,
        created_at
      FROM training_courses
      WHERE ${whereClause}
      ORDER BY course_category, course_name
    `);
    });

      return NextResponse.json({
        success: true,
        data: result,
        count: result.length,
      });

    } catch (error) {
      logger.error('Failed to fetch training courses', error as Error, {
        organizationId: request.nextUrl.searchParams.get('organizationId'),
        correlationId: request.headers.get('x-correlation-id'),
      });
      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Internal Server Error',
      error
    );
    }
    })(request);
};


const educationCoursesSchema = z.object({
  organizationId: z.string().uuid('Invalid organizationId'),
  courseName: z.string().min(1, 'courseName is required'),
  courseDescription: z.string().optional(),
  courseCategory: z.unknown().optional(),
  deliveryMethod: z.unknown().optional(),
  courseDifficulty: z.unknown().optional(),
  durationHours: z.unknown().optional(),
  durationDays: z.unknown().optional(),
  learningObjectives: z.unknown().optional(),
  courseOutline: z.unknown().optional(),
  providesCertification: z.string().uuid('Invalid providesCertification'),
  certificationName: z.string().min(1, 'certificationName is required'),
  certificationValidYears: z.string().uuid('Invalid certificationValidYears'),
  clcApproved: z.unknown().optional(),
  minEnrollment: z.unknown().optional(),
  maxEnrollment: z.unknown().optional(),
  courseMaterialsUrl: z.string().url('Invalid URL'),
  isActive: z.boolean().optional(),
  clcApprovalDate: z.string().datetime().optional(),
});

export const POST = async (request: NextRequest) => {
  return withRoleAuth(20, async (request, context) => {
    const { userId } = context;

  try {
      const body = await request.json();
    // Validate request body
    const validation = educationCoursesSchema.safeParse(body);
    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request data',
        validation.error.errors
      );
    }
    
    const { organizationId, courseName, courseDescription, courseCategory, deliveryMethod, courseDifficulty, durationHours, durationDays, learningObjectives, courseOutline, providesCertification, certificationName, certificationValidYears, clcApproved, minEnrollment, maxEnrollment, courseMaterialsUrl, isActive, clcApprovalDate } = validation.data;
    // DUPLICATE REMOVED (Phase 2): Multi-line destructuring of body
    // const {
    // organizationId,
    // courseName,
    // courseDescription,
    // courseCategory,
    // deliveryMethod,
    // courseDifficulty,
    // durationHours,
    // durationDays,
    // learningObjectives,
    // courseOutline,
    // providesCertification,
    // certificationName,
    // certificationValidYears,
    // clcApproved,
    // minEnrollment,
    // maxEnrollment,
    // } = body;
  if (organizationId && organizationId !== context.organizationId) {
    return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Forbidden'
    );
  }


      // Validate required fields
      if (!organizationId || !courseName || !courseCategory || !deliveryMethod) {
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Bad Request - organizationId, courseName, courseCategory, and deliveryMethod are required'
      // TODO: Migrate additional details: courseName, courseCategory, and deliveryMethod are required'
    );
      }

      // Generate course code
      const categoryPrefix = courseCategory.substring(0, 3).toUpperCase();
      const timestamp = Date.now().toString(36).toUpperCase();
      const random = Math.random().toString(36).substring(2, 4).toUpperCase();
      const courseCode = `${categoryPrefix}-${timestamp}-${random}`;

      // Insert course
      const result = await withRLSContext(async (tx) => {
      return await tx.execute(sql`
      INSERT INTO training_courses (
        id,
        organization_id,
        course_code,
        course_name,
        course_description,
        course_category,
        delivery_method,
        course_difficulty,
        duration_hours,
        duration_days,
        learning_objectives,
        course_outline,
        provides_certification,
        certification_name,
        certification_valid_years,
        clc_approved,
        min_enrollment,
        max_enrollment,
        is_active,
        created_at,
        updated_at,
        created_by
      ) VALUES (
        gen_random_uuid(),
        ${organizationId}, ${courseCode}, ${courseName},
        ${courseDescription || null}, ${courseCategory}, ${deliveryMethod},
        ${courseDifficulty || 'all_levels'}, ${durationHours || null},
        ${durationDays || null}, ${learningObjectives || null},
        ${courseOutline ? JSON.stringify(courseOutline) : null},
        ${providesCertification !== undefined ? providesCertification : false},
        ${certificationName || null}, ${certificationValidYears || null},
        ${clcApproved !== undefined ? clcApproved : false},
        ${minEnrollment || 5}, ${maxEnrollment || 30}, ${true},
        NOW(), NOW(), ${userId}
      )
      RETURNING *
    `);
    });

      return standardSuccessResponse(
      { data: result[0],
        message: 'Training course created successfully', },
      undefined,
      201
    );

    } catch (error) {
      logger.error('Failed to create training course', error as Error, {
        correlationId: request.headers.get('x-correlation-id'),
      });
      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Internal Server Error',
      error
    );
    }
    })(request);
};

export const PATCH = async (request: NextRequest) => {
  return withRoleAuth(20, async (request, context) => {
  try {
      const { searchParams } = new URL(request.url);
      const courseId = searchParams.get('id');

      if (!courseId) {
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Bad Request - id parameter is required'
    );
      }

      const body = await request.json();
    // DUPLICATE REMOVED (Phase 2): Multi-line destructuring of body
    // const {
    // courseDescription,
    // learningObjectives,
    // courseOutline,
    // courseMaterialsUrl,
    // isActive,
    // clcApproved,
    // clcApprovalDate,
    // } = body;

      // Build update query
      const updates: Array<Record<string, unknown>> = [];

      if (courseDescription !== undefined) {
        updates.push(sql`course_description = ${courseDescription}`);
      }
      if (learningObjectives !== undefined) {
        updates.push(sql`learning_objectives = ${learningObjectives}`);
      }
      if (courseOutline !== undefined) {
        updates.push(sql`course_outline = ${JSON.stringify(courseOutline)}`);
      }
      if (courseMaterialsUrl !== undefined) {
        updates.push(sql`course_materials_url = ${courseMaterialsUrl}`);
      }
      if (isActive !== undefined) {
        updates.push(sql`is_active = ${isActive}`);
      }
      if (clcApproved !== undefined) {
        updates.push(sql`clc_approved = ${clcApproved}`);
      }
      if (clcApprovalDate !== undefined) {
        updates.push(sql`clc_approval_date = ${clcApprovalDate}`);
      }

      if (updates.length === 0) {
        return NextResponse.json(
          { error: 'Bad Request - No fields to update' },
          { status: 400 }
        );
      }

      updates.push(sql`updated_at = NOW()`);
      const setClause = sql.join(updates, sql.raw(', '));

      const result = await withRLSContext(async (tx) => {
      return await tx.execute(sql`
      UPDATE training_courses
      SET ${setClause}
      WHERE id = ${courseId}
      RETURNING *
    `);
    });

      if (result.length === 0) {
        return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Not Found - Course not found'
    );
      }

      return NextResponse.json({
        success: true,
        data: result[0],
        message: 'Training course updated successfully',
      });

    } catch (error) {
      logger.error('Failed to update training course', error as Error, {
        courseId: request.nextUrl.searchParams.get('id'),
        correlationId: request.headers.get('x-correlation-id'),
      });
      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Internal Server Error',
      error
    );
    }
    })(request);
};
