import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * API Route: Pension Plans
 * Manage pension plans for organizations
 * Phase 1: Pension & Health/Welfare
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { pensionPlans } from '@/db/schema';
import { and, desc } from 'drizzle-orm';
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

      if (!organizationId) {
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Bad Request - organizationId is required'
    );
      }

      // Fetch pension plans for the organization
      const plans = await db
        .select()
        .from(pensionPlans)
        .where(eq(pensionPlans.organizationId, organizationId))
        .orderBy(desc(pensionPlans.createdAt));

      return NextResponse.json({
        success: true,
        data: plans,
        count: plans.length,
      });

    } catch (error) {
      logger.error('Failed to fetch pension plans', error as Error, {      organizationId: request.nextUrl.searchParams.get('organizationId'),
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


const pensionPlansSchema = z.object({
  organizationId: z.string().uuid('Invalid organizationId'),
  planName: z.string().min(1, 'planName is required'),
  planType: z.unknown().optional(),
  planNumber: z.unknown().optional(),
  contributionRate: z.unknown().optional(),
  normalRetirementAge: z.unknown().optional(),
  vestingPeriodYears: z.unknown().optional(),
  trustAgreementUrl: z.string().url('Invalid URL'),
  planStatus: z.unknown().optional(),
  planEffectiveDate: z.string().datetime().optional(),
  planYearEnd: z.unknown().optional(),
});

export const POST = async (request: NextRequest) => {
  return withRoleAuth(20, async (request, context) => {
    try {
      const body = await request.json();
    // Validate request body
    const validation = pensionPlansSchema.safeParse(body);
    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request data',
        validation.error.errors
      );
    }
    
    const { organizationId, planName, planType, planNumber, contributionRate, normalRetirementAge, vestingPeriodYears, trustAgreementUrl, planStatus, planEffectiveDate, planYearEnd } = validation.data;
      const {
        organizationId,
        planName,
        planType,
        planNumber,
        contributionRate,
        normalRetirementAge,
        vestingPeriodYears,
        trustAgreementUrl,
        planStatus,
        planEffectiveDate,
        planYearEnd,
      } = body;
  if (organizationId && organizationId !== context.organizationId) {
    return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Forbidden'
    );
  }


      // Validate required fields
      if (!organizationId || !planName || !planType || !planEffectiveDate || !planYearEnd) {
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Bad Request - organizationId, planName, planType, planEffectiveDate, and planYearEnd are required'
    );
      }

      // Create pension plan
      const [newPlan] = await db
        .insert(pensionPlans)
        .values({
          organizationId,
          planName,
          planType,
          planNumber,
          contributionRate: contributionRate ? String(contributionRate) : null,
          normalRetirementAge: normalRetirementAge || 65,
          vestingPeriodYears: vestingPeriodYears || 2,
          planStatus: planStatus || 'active',
          planEffectiveDate,
          planYearEnd,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .returning();

      return standardSuccessResponse(
      { data: newPlan,
        message: 'Pension plan created successfully', },
      undefined,
      201
    );

    } catch (error) {
      logger.error('Failed to create pension plan', error as Error, {      correlationId: request.headers.get('x-correlation-id'),
      });
      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Internal Server Error',
      error
    );
    }
    })(request);
};

