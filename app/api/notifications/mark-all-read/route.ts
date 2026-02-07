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
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";

export const POST = async (request: NextRequest) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
    const user = { id: context.userId, organizationId: context.organizationId };

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
            eq(inAppNotifications.user.id, user.id),
            eq(inAppNotifications.read, false)
          )
        );

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  })
  })(request);
};
