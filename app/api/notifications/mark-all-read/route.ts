import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * API Route: POST /api/notifications/mark-all-read
 * 
 * Mark all notifications as read for current user
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { inAppNotifications } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
export const POST = async (request: NextRequest) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      // Mark all unread notifications as read
      await db
        .update(inAppNotifications)
        .set({
          read: true,
          readAt: new Date(),
        })
        .where(
          and(
            eq(inAppNotifications.userId, userId),
            eq(inAppNotifications.read, false)
          )
        );

      return NextResponse.json({ success: true });
    } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Internal server error',
      error
    );
    }
    })(request);
};

