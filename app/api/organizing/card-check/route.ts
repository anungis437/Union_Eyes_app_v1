import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * API Route: Card Check Validation
 * Validate organizing campaign card checks
 * Phase 3: Organizing & Certification
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { logger } from '@/lib/logger';
import { z } from "zod";
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';

import { standardSuccessResponse } from '@/lib/api/standardized-responses';
export const dynamic = 'force-dynamic';


const organizingCardCheckSchema = z.object({
  campaignId: z.string().uuid('Invalid campaignId'),
  validationDate: z.string().uuid('Invalid validationDate'),
});

export const POST = async (request: NextRequest) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
  try {
      const body = await request.json();
    // Validate request body
    const validation = organizingCard-checkSchema.safeParse(body);
    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request data',
        validation.error.errors
      );
    }
    
    const { campaignId, validationDate } = validation.data;
      const { campaignId, validationDate } = body;

      if (!campaignId) {
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Bad Request - campaignId is required'
    );
      }

      const date = validationDate || new Date().toISOString().split('T')[0];

      // Call database function
      const result = await db.execute(
        sql`SELECT * FROM validate_card_check_threshold(${campaignId}::uuid, ${date}::date)`
      );

      const validation = result[0];

      return NextResponse.json({
        success: true,
        data: {        validationDate: date,
          isValid: validation?.is_valid || false,
          totalContacts: validation?.total_contacts || 0,
          cardsSigned: validation?.cards_signed || 0,
          supportPercentage: parseFloat(validation?.support_percentage as string || '0'),
          thresholdMet: validation?.threshold_met || false,
          requiredPercentage: parseFloat(validation?.required_percentage as string || '0'),
          validationMessage: validation?.validation_message || '',
        },
      });

    } catch (error) {
      logger.error('Failed to validate card check', error as Error, {      correlationId: request.headers.get('x-correlation-id'),
      });
      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Internal Server Error',
      error
    );
    }
    })(request);
};

