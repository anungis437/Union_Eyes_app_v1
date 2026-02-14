import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * API Route: Pension Benefits Calculation
 * Calculate pension benefits using database functions
 * Phase 1: Pension & Health/Welfare
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { logger } from '@/lib/logger';
import { z } from "zod";
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';

import { standardSuccessResponse } from '@/lib/api/standardized-responses';
export const dynamic = 'force-dynamic';


const pensionBenefitsSchema = z.object({
  pensionPlanId: z.string().uuid('Invalid pensionPlanId'),
  memberId: z.string().uuid('Invalid memberId'),
  calculationDate: z.string().datetime().optional(),
});

export const POST = async (request: NextRequest) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
    try {
      const body = await request.json();
    // Validate request body
    const validation = pensionBenefitsSchema.safeParse(body);
    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request data',
        validation.error.errors
      );
    }
    
    const { pensionPlanId, memberId, calculationDate } = validation.data;
      const { pensionPlanId, memberId, calculationDate } = body;

      if (!pensionPlanId || !memberId) {
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Bad Request - pensionPlanId and memberId are required'
    );
      }

      const date = calculationDate || new Date().toISOString().split('T')[0];

      // Call database function
      const result = await db.execute(
        sql`SELECT * FROM calculate_pension_benefit(${pensionPlanId}::uuid, ${memberId}::uuid, ${date}::date)`
      );

      const benefitAmount = result[0]?.benefit_amount;

      return NextResponse.json({
        success: true,
        data: {
          pensionPlanId,
          memberId,
          calculationDate: date,
          benefitAmount: benefitAmount ? parseFloat(benefitAmount as string) : 0,
        },
      });

    } catch (error) {
      logger.error('Failed to calculate pension benefit', error as Error, {      correlationId: request.headers.get('x-correlation-id'),
      });
      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Internal Server Error',
      error
    );
    }
    })(request);
};

