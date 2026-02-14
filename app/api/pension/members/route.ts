import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * API Route: Pension Plan Members
 * Manage member enrollments and hours banks
 * Phase 2: Pension & H&W Trust Administration
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
      const planId = searchParams.get('planId');
      const memberId = searchParams.get('memberId');

      if (!planId) {
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Bad Request - planId is required'
    );
      }

      const conditions = [sql`ppm.pension_plan_id = ${planId}`];
      if (memberId) {
        conditions.push(sql`ppm.member_id = ${memberId}`);
      }

      const result = await db.execute(sql`
      SELECT 
        ppm.id,
        ppm.pension_plan_id,
        ppm.member_id,
        m.first_name,
        m.last_name,
        m.email,
        ppm.enrollment_date,
        ppm.enrollment_status,
        ppm.service_credit_years,
        ppm.accumulated_contributions,
        ppm.estimated_monthly_benefit,
        ppm.beneficiary_name,
        ppm.beneficiary_relationship,
        ppm.created_at
      FROM pension_plan_members ppm
      JOIN members m ON m.id = ppm.member_id
      WHERE ${sql.join(conditions, sql.raw(' AND '))}
      ORDER BY m.last_name, m.first_name
    `);

      return NextResponse.json({
        success: true,
        data: result,
        count: result.length,
      });

    } catch (error) {
      logger.error('Failed to fetch pension plan members', error as Error, {
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


const pensionMembersSchema = z.object({
  pensionPlanId: z.string().uuid('Invalid pensionPlanId'),
  memberId: z.string().uuid('Invalid memberId'),
  enrollmentDate: z.string().datetime().optional(),
  beneficiaryName: z.string().min(1, 'beneficiaryName is required'),
  beneficiaryRelationship: z.unknown().optional(),
});

export const POST = async (request: NextRequest) => {
  return withRoleAuth(20, async (request, context) => {
    try {
      const body = await request.json();
    // Validate request body
    const validation = pensionMembersSchema.safeParse(body);
    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request data',
        validation.error.errors
      );
    }
    
    const { pensionPlanId, memberId, enrollmentDate, beneficiaryName, beneficiaryRelationship } = validation.data;
      const {
        pensionPlanId,
        memberId,
        enrollmentDate,
        beneficiaryName,
        beneficiaryRelationship,
      } = body;

      if (!pensionPlanId || !memberId || !enrollmentDate) {
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Bad Request - pensionPlanId, memberId, and enrollmentDate are required'
      // TODO: Migrate additional details: memberId, and enrollmentDate are required'
    );
      }

      const result = await db.execute(sql`
      INSERT INTO pension_plan_members (
        id,
        pension_plan_id,
        member_id,
        enrollment_date,
        enrollment_status,
        service_credit_years,
        accumulated_contributions,
        beneficiary_name,
        beneficiary_relationship,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        ${pensionPlanId}, ${memberId}, ${enrollmentDate},
        'active', 0, 0,
        ${beneficiaryName}, ${beneficiaryRelationship},
        NOW(), NOW()
      )
      RETURNING *
    `);

      return standardSuccessResponse(
      { data: result[0],
        message: 'Member enrolled in pension plan successfully', },
      undefined,
      201
    );

    } catch (error) {
      logger.error('Failed to enroll member in pension plan', error as Error, {
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

