import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * API Route: Jurisdiction Deadline Validation
 * Validate deadlines against jurisdiction rules
 * CLC Compliance & Jurisdiction Management
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { logger } from '@/lib/logger';
import { z } from "zod";
import { withApiAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';

import { standardSuccessResponse } from '@/lib/api/standardized-responses';
export const dynamic = 'force-dynamic';

const jurisdictionValidateDeadlineSchema = z.object({
  jurisdictionId: z.string().uuid('Invalid jurisdictionId'),
  actionType: z.unknown().optional(),
  proposedDate: z.string().datetime().optional(),
  eventDate: z.string().datetime().optional(),
});

export const POST = async (request: NextRequest) => {
  return withRoleAuth(20, async (request, context) => {
  let body: any;
    try {
      body = await request.json();
      const { jurisdictionId, actionType, proposedDate, eventDate } = body;

      if (!jurisdictionId || !actionType || !proposedDate || !eventDate) {
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Bad Request - jurisdictionId, actionType, proposedDate, and eventDate are required'
      // TODO: Migrate additional details: actionType, proposedDate, and eventDate are required'
    );
      }

      // Call database function
      const result = await db.execute(
        sql`SELECT * FROM validate_jurisdiction_deadline(
        ${jurisdictionId}::uuid, 
        ${actionType}::VARCHAR, 
        ${proposedDate}::date, 
        ${eventDate}::date
      )`
      );

      const validation = result[0];

      return NextResponse.json({
        success: true,
        data: {
          jurisdictionId,
          actionType,
          proposedDate,
          eventDate,
          isValid: validation?.is_valid || false,
          requiredNoticeDays: validation?.required_notice_days || 0,
          actualNoticeDays: validation?.actual_notice_days || 0,
          deadlineDate: validation?.deadline_date || null,
          validationMessage: validation?.validation_message || '',
        },
      });

    } catch (error) {
      logger.error('Failed to validate jurisdiction deadline', error as Error, {      jurisdictionId: body?.jurisdictionId,
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

