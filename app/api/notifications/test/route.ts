import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * API Route: Test Email Notification
 * 
 * Allows testing email notifications without changing claim status
 * Admin only endpoint for development/testing
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendClaimStatusNotification } from '@/lib/claim-notifications';
import { z } from "zod";
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';

import { standardSuccessResponse } from '@/lib/api/standardized-responses';

const notificationsTestSchema = z.object({
  claimId: z.string().uuid('Invalid claimId'),
  previousStatus: z.unknown().optional(),
  newStatus: z.unknown().optional(),
  notes: z.string().optional(),
});

export const POST = async (request: NextRequest) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
  try {
      // Verify authentication
      // Parse request body
      const body = await request.json();
    // Validate request body
    const validation = notificationsTestSchema.safeParse(body);
    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request data',
        validation.error.errors
      );
    }
    
    const { claimId, previousStatus, newStatus, notes } = validation.data;
      const { claimId, previousStatus, newStatus, notes } = body;

      if (!claimId || !newStatus) {
        return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Missing required fields: claimId, newStatus'
    );
      }

      // Send test notification
      const result = await sendClaimStatusNotification(
        claimId,
        previousStatus,
        newStatus,
        notes
      );

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || 'Failed to send notification' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Test notification sent successfully',
      });
    } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Internal server error',
      error
    );
    }
    })(request);
};

