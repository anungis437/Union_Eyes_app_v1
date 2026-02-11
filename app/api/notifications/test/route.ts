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

export const POST = async (request: NextRequest) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
  try {
      // Verify authentication
      // Parse request body
      const body = await request.json();
      const { claimId, previousStatus, newStatus, notes } = body;

      if (!claimId || !newStatus) {
        return NextResponse.json(
          { error: 'Missing required fields: claimId, newStatus' },
          { status: 400 }
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
return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
    })(request);
};

