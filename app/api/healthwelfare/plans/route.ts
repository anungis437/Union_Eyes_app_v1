import { withRLSContext } from '@/lib/db/with-rls-context';
import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * API Route: Health & Welfare Plans
 * Manage H&W benefit plans and member eligibility
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
    const user = { id: context.userId, organizationId: context.organizationId };

  try {
      const { searchParams } = new URL(request.url);
      const organizationId = searchParams.get('organizationId');

      if (!organizationId) {
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Bad Request - organizationId is required'
    );
      }

      const result = await withRLSContext(async (tx) => {
      return await tx.execute(sql`
      SELECT 
        id,
        organization_id,
        plan_name,
        plan_number,
        plan_type,
        plan_status,
        coverage_start_date,
        coverage_end_date,
        insurance_carrier,
        policy_number,
        monthly_premium_single,
        monthly_premium_family,
        annual_deductible_single,
        annual_deductible_family,
        out_of_pocket_max_single,
        out_of_pocket_max_family,
        prescription_coverage,
        dental_coverage,
        vision_coverage,
        created_at,
        updated_at
      FROM hw_plans
      WHERE organization_id = ${organizationId}
      ORDER BY plan_name ASC
    `);
    });

      return NextResponse.json({
        success: true,
        data: result,
        count: result.length,
      });

    } catch (error) {
      logger.error('Failed to fetch H&W plans', error as Error, {
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


const healthwelfarePlansSchema = z.object({
  organizationId: z.string().uuid('Invalid organizationId'),
  planName: z.string().min(1, 'planName is required'),
  planType: z.unknown().optional(),
  insuranceCarrier: z.unknown().optional(),
  coverageStartDate: z.string().datetime().optional(),
  monthlyPremiumSingle: z.unknown().optional(),
  monthlyPremiumFamily: z.unknown().optional(),
});

export const POST = async (request: NextRequest) => {
  return withRoleAuth(20, async (request, context) => {
    const user = { id: context.userId, organizationId: context.organizationId };

  try {
      const body = await request.json();
    // Validate request body
    const validation = healthwelfarePlansSchema.safeParse(body);
    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request data',
        validation.error.errors
      );
    }
    
    const { organizationId, planName, planType, insuranceCarrier, coverageStartDate, monthlyPremiumSingle, monthlyPremiumFamily } = validation.data;
    // DUPLICATE REMOVED (Phase 2): Multi-line destructuring of body
    // const {
    // organizationId,
    // planName,
    // planType,
    // insuranceCarrier,
    // coverageStartDate,
    // monthlyPremiumSingle,
    // monthlyPremiumFamily,
    // } = body;
  if (organizationId && organizationId !== context.organizationId) {
    return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Forbidden'
    );
  }


      if (!organizationId || !planName || !planType || !coverageStartDate) {
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Bad Request - organizationId, planName, planType, and coverageStartDate are required'
    );
      }

      const result = await withRLSContext(async (tx) => {
      return await tx.execute(sql`
      INSERT INTO hw_plans (
        id,
        organization_id,
        plan_name,
        plan_type,
        plan_status,
        insurance_carrier,
        coverage_start_date,
        monthly_premium_single,
        monthly_premium_family,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        ${organizationId}, ${planName}, ${planType}, 'active',
        ${insuranceCarrier}, ${coverageStartDate},
        ${monthlyPremiumSingle}, ${monthlyPremiumFamily},
        NOW(), NOW()
      )
      RETURNING *
    `);
    });

      return standardSuccessResponse(
      { data: result[0],
        message: 'H&W plan created successfully', },
      undefined,
      201
    );

    } catch (error) {
      logger.error('Failed to create H&W plan', error as Error, {
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
