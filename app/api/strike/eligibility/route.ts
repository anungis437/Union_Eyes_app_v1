/**
 * API Route: Strike Eligibility Check
 * Check member eligibility for strike benefits
 * Phase 4: Strike Fund Management
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db/db';
import { sql } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';
import { logApiAuditEvent } from '@/lib/middleware/request-validation';

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
export const dynamic = 'force-dynamic';

// Validation schema for eligibility check
const eligibilityCheckSchema = z.object({
  strikeFundId: z.string().uuid('Invalid strike fund ID format'),
  memberId: z.string().uuid('Invalid member ID format'),
  checkDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

/**
 * POST /api/strike/eligibility
 * Check if a member is eligible for strike benefits
 * Uses the calculate_strike_eligibility database function
 */
export const POST = withEnhancedRoleAuth(60, async (request, context) => {
  try {
    const body = await request.json();
    const parsed = eligibilityCheckSchema.safeParse(body);

    if (!parsed.success) {
      return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid request body'
    );
    }

    const { strikeFundId, memberId, checkDate } = parsed.data;
    const date = checkDate || new Date().toISOString().split('T')[0];

      // Call database function
      const result = await db.execute(
        sql`SELECT * FROM calculate_strike_eligibility(${strikeFundId}::uuid, ${memberId}::uuid, ${date}::date)`
      );

      const eligibility = result[0];

      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId: context.userId,
        endpoint: '/api/strike/eligibility',
        method: 'POST',
        eventType: 'success',
        severity: 'high',
        details: {
          dataType: 'FINANCIAL',
          strikeFundId,
          memberId,
          checkDate: date,
          isEligible: eligibility?.is_eligible || false,
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          strikeFundId,
          memberId,
          checkDate: date,
          isEligible: eligibility?.is_eligible || false,
          eligibilityReason: eligibility?.eligibility_reason || '',
          membershipDurationMet: eligibility?.membership_duration_met || false,
          duesCurrentStatus: eligibility?.dues_current_status || false,
          requiredMembershipMonths: eligibility?.required_membership_months || 0,
        },
      });

  } catch (error) {
    logger.error('Failed to check strike eligibility', error as Error, {
      userId: context.userId,
      correlationId: request.headers.get('x-correlation-id'),
    });

    logApiAuditEvent({
      timestamp: new Date().toISOString(),
      userId: context.userId,
      endpoint: '/api/strike/eligibility',
      method: 'POST',
      eventType: 'error',
      severity: 'high',
      details: { 
        dataType: 'FINANCIAL',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Internal server error',
      error
    );
  }
});

