import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * API Route: Retirement Eligibility
 * Check retirement eligibility for members
 * Phase 1: Pension & Health/Welfare
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { logger } from '@/lib/logger';
import { z } from "zod";
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';

import { standardSuccessResponse } from '@/lib/api/standardized-responses';
export const dynamic = 'force-dynamic';


const pensionRetirementEligibilitySchema = z.object({
  pensionPlanId: z.string().uuid('Invalid pensionPlanId'),
  memberId: z.string().uuid('Invalid memberId'),
  checkDate: z.string().datetime().optional(),
});

export const POST = async (request: NextRequest) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
    try {
      const body = await request.json();
    // Validate request body
    const validation = pensionRetirement-eligibilitySchema.safeParse(body);
    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request data',
        validation.error.errors
      );
    }
    
    const { pensionPlanId, memberId, checkDate } = validation.data;
      const { pensionPlanId, memberId, checkDate } = body;

      if (!pensionPlanId || !memberId) {
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Bad Request - pensionPlanId and memberId are required'
    );
      }

      const date = checkDate || new Date().toISOString().split('T')[0];

      // Call database function
      const result = await db.execute(
        sql`SELECT * FROM calculate_pension_eligibility(${pensionPlanId}::uuid, ${memberId}::uuid, ${date}::date)`
      );

      const eligibility = result[0];

      return NextResponse.json({
        success: true,
        data: {
          pensionPlanId,
          memberId,
          checkDate: date,
          isEligible: eligibility?.is_eligible || false,
          eligibilityType: eligibility?.eligibility_type || null,
          reason: eligibility?.reason || null,
          minimumHoursMet: eligibility?.minimum_hours_met || false,
          ageRequirementMet: eligibility?.age_requirement_met || false,
          vestingPeriodMet: eligibility?.vesting_period_met || false,
        },
      });

    } catch (error) {
      logger.error('Failed to check retirement eligibility', error as Error, {      correlationId: request.headers.get('x-correlation-id'),
      });
      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Internal Server Error',
      error
    );
    }
    })(request);
};

