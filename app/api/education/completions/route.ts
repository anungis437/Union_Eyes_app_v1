import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * API Route: Course Completions & Certificates
 * Track course completions and issue certificates
 * Phase 3: Education & Training
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { sql } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { sendCompletionCertificate } from '@/lib/email/training-notifications';
import { z } from "zod";
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
export const dynamic = 'force-dynamic';

export const GET = async (request: NextRequest) => {
  return withRoleAuth(10, async (request, context) => {
  try {
      const { searchParams } = new URL(request.url);
      const memberId = searchParams.get('memberId');
      const courseId = searchParams.get('courseId');
      const includeExpired = searchParams.get('includeExpired');

      if (!memberId) {
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Bad Request - memberId is required'
    );
      }

      // Build query with joins
      const conditions = [sql`cr.member_id = ${memberId}`, sql`cr.completed = true`];

      if (courseId) {
        conditions.push(sql`cr.course_id = ${courseId}`);
      }

      const whereClause = sql.join(conditions, sql.raw(' AND '));

      const result = await db.execute(sql`
      SELECT 
        cr.id,
        cr.member_id,
        cr.course_id,
        cr.session_id,
        cr.completion_date,
        cr.completion_percentage,
        cr.passed,
        cr.certificate_issued,
        cr.certificate_number,
        cr.certificate_url,
        tc.course_name,
        tc.course_code,
        tc.course_category,
        tc.certification_name,
        tc.certification_valid_years,
        cs.session_code,
        cs.start_date,
        cs.end_date,
        m.first_name,
        m.last_name,
        m.member_number
      FROM course_registrations cr
      INNER JOIN training_courses tc ON cr.course_id = tc.id
      INNER JOIN course_sessions cs ON cr.session_id = cs.id
      INNER JOIN members m ON cr.member_id = m.id
      WHERE ${whereClause}
      ORDER BY cr.completion_date DESC
    `);

      // Calculate expiry status for certifications
      const completions = result.map((row: any) => {
        const expiryDate = row.certification_valid_years && row.completion_date
          ? new Date(row.completion_date)
          : null;
        
        if (expiryDate) {
          expiryDate.setFullYear(expiryDate.getFullYear() + row.certification_valid_years);
        }

        const isExpired = expiryDate ? new Date() > expiryDate : false;
        const daysUntilExpiry = expiryDate 
          ? Math.ceil((expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
          : null;

        return {
          ...row,
          expiry_date: expiryDate?.toISOString().split('T')[0],
          is_expired: isExpired,
          days_until_expiry: daysUntilExpiry,
          expiring_soon: daysUntilExpiry !== null && daysUntilExpiry > 0 && daysUntilExpiry <= 90,
        };
      });

      // Filter out expired if requested
      const filteredCompletions = includeExpired === 'true'
        ? completions
        : completions.filter((c: any) => !c.is_expired);

      return NextResponse.json({
        success: true,
        data: filteredCompletions,
        count: filteredCompletions.length,
      });

    } catch (error) {
      logger.error('Failed to fetch course completions', error as Error, {
        memberId: request.nextUrl.searchParams.get('memberId'),
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


const educationCompletionsSchema = z.object({
  registrationId: z.string().uuid('Invalid registrationId'),
  completionDate: z.string().datetime().optional(),
  completionPercentage: z.unknown().optional(),
  finalGrade: z.unknown().optional(),
  passed: z.string().min(1, 'passed is required'),
  preTestScore: z.unknown().optional(),
  postTestScore: z.unknown().optional(),
});

export const POST = async (request: NextRequest) => {
  return withRoleAuth(20, async (request, context) => {
  try {
      const body = await request.json();
    // Validate request body
    const validation = educationCompletionsSchema.safeParse(body);
    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request data',
        validation.error.errors
      );
    }
    
    const { registrationId, completionDate, completionPercentage, finalGrade, passed, preTestScore, postTestScore } = validation.data;
      const {
        registrationId,
        completionDate,
        completionPercentage,
        finalGrade,
        passed,
        preTestScore,
        postTestScore,
      } = body;

      // Validate required fields
      if (!registrationId || passed === undefined) {
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Bad Request - registrationId and passed are required'
    );
      }

      // Get registration and course details
      const regCheck = await db.execute(sql`
      SELECT 
        cr.id,
        cr.member_id,
        cr.course_id,
        tc.course_name,
        tc.course_code,
        tc.provides_certification,
        tc.certification_name,
        m.member_number,
        m.first_name,
        m.last_name
      FROM course_registrations cr
      INNER JOIN training_courses tc ON cr.course_id = tc.id
      INNER JOIN members m ON cr.member_id = m.id
      WHERE cr.id = ${registrationId}
    `);

      if (regCheck.length === 0) {
        return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Not Found - Registration not found'
    );
      }

      const registration = regCheck[0];

      // Generate certificate number if passed and certification is provided
      let certificateNumber = null;
      let certificateIssued = false;

      if (passed && registration.provides_certification) {
        const timestamp = Date.now().toString(36).toUpperCase();
        const memberNum = String(registration.member_number || '').replace(/[^0-9]/g, '');
        certificateNumber = `CERT-${registration.course_code}-${memberNum}-${timestamp}`;
        certificateIssued = true;
      }

      // Update registration with completion data
      const result = await db.execute(sql`
      UPDATE course_registrations
      SET 
        completed = ${true},
        completion_date = ${completionDate || new Date().toISOString().split('T')[0]},
        completion_percentage = ${completionPercentage || 100},
        final_grade = ${finalGrade || (passed ? 'Pass' : 'Fail')},
        passed = ${passed},
        pre_test_score = ${preTestScore || null},
        post_test_score = ${postTestScore || null},
        certificate_issued = ${certificateIssued},
        certificate_number = ${certificateNumber},
        certificate_issue_date = ${certificateIssued ? new Date().toISOString().split('T')[0] : null},
        registration_status = 'completed',
        updated_at = NOW()
      WHERE id = ${registrationId}
      RETURNING *
    `);

      // Update session completion count
      await db.execute(sql`
      UPDATE course_sessions cs
      SET 
        completions_count = completions_count + 1,
        completion_rate = ROUND((completions_count + 1) * 100.0 / NULLIF(attendees_count, 0), 2),
        updated_at = NOW()
      WHERE cs.id = (SELECT session_id FROM course_registrations WHERE id = ${registrationId})
    `);

      // Auto-generate certificate PDF if passed and certification is provided
      let certificateUrl = null;
      if (passed && registration.provides_certification) {
        try {
          // Call certificate generation endpoint
          const certGenResponse = await fetch(
            `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/education/certifications/generate?registrationId=${registrationId}`,
            {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );

          if (certGenResponse.ok) {
            const certData = await certGenResponse.json();
            certificateUrl = certData.certificateUrl;
            certificateNumber = certData.certificateNumber;
            logger.info('Certificate auto-generated on completion', {
              registrationId,
              certificateUrl,
              certificationId: certData.certificationId,
            });
          } else {
            logger.warn('Failed to auto-generate certificate', {
              registrationId,
              status: certGenResponse.status,
            });
          }
        } catch (certError) {
          logger.error('Error auto-generating certificate', certError as Error, {
            registrationId,
          });
          // Don't fail the completion if certificate generation fails
        }
      }

      // Send completion email (non-blocking)
      if (passed) {
        const emailData = await db.execute(sql`
        SELECT 
          m.email, m.first_name, m.last_name,
          c.course_name, c.course_code, c.total_hours, c.continuing_education_hours, c.clc_approved
        FROM course_registrations cr
        JOIN members m ON m.id = cr.member_id
        JOIN training_courses c ON c.id = cr.course_id
        WHERE cr.id = ${registrationId}
      `);

        if (emailData.length > 0) {
          const data = emailData[0] as Record<string, unknown>;
          sendCompletionCertificate({
            toEmail: String(data.email || ''),
            memberName: `${data.first_name || ''} ${data.last_name || ''}`.trim(),
            courseName: String(data.course_name || ''),
            courseCode: String(data.course_code || 'N/A'),
            completionDate: completionDate ? new Date(completionDate).toLocaleDateString() : new Date().toLocaleDateString(),
            finalGrade: finalGrade || undefined,
            totalHours: data.total_hours ? Number(data.total_hours) : undefined,
            certificateNumber: certificateNumber || `CERT-${registrationId.substring(0, 8).toUpperCase()}`,
            certificateUrl: certificateUrl || `${process.env.NEXT_PUBLIC_APP_URL}/education/certificates`,
            continuingEducationHours: data.continuing_education_hours ? Number(data.continuing_education_hours) : undefined,
            clcApproved: Boolean(data.clc_approved),
          }).catch(err => logger.error('Failed to send completion certificate email', err));
        }
      }

      return standardSuccessResponse(
      { data: result[0],
        certificateUrl,
        message: certificateIssued 
          ? 'Course completed and certificate issued successfully' 
          : 'Course completion recorded successfully', },
      undefined,
      201
    );

    } catch (error) {
      logger.error('Failed to record course completion', error as Error, {
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

