import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * API Route: Campaign Support Percentage
 * Calculate support percentage for organizing campaigns
 * Phase 3: Organizing & Certification
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { logger } from '@/lib/logger';
import { z } from "zod";
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';

import { standardSuccessResponse } from '@/lib/api/standardized-responses';
export const dynamic = 'force-dynamic';


const organizingSupportPercentageSchema = z.object({
  campaignId: z.string().uuid('Invalid campaignId'),
  asOfDate: z.string().datetime().optional(),
});

export const POST = async (request: NextRequest) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
  try {
      const body = await request.json();
    // Validate request body
    const validation = organizingSupport-percentageSchema.safeParse(body);
    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request data',
        validation.error.errors
      );
    }
    
    const { campaignId, asOfDate } = validation.data;
      const { campaignId, asOfDate } = body;

      if (!campaignId) {
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Bad Request - campaignId is required'
    );
      }

      const date = asOfDate || new Date().toISOString().split('T')[0];

      // Call database function
      const result = await db.execute(
        sql`SELECT calculate_support_percentage(${campaignId}::uuid, ${date}::date) as support_percentage`
      );

      const supportPercentage = result[0]?.support_percentage;

      return NextResponse.json({
        success: true,
        data: {        asOfDate: date,
          supportPercentage: supportPercentage ? parseFloat(supportPercentage as string) : 0,
        },
      });

    } catch (error) {
      logger.error('Failed to calculate support percentage', error as Error, {      correlationId: request.headers.get('x-correlation-id'),
      });
      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Internal Server Error',
      error
    );
    }
    })(request);
};

