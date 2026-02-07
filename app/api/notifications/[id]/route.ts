import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * API Route: PATCH /api/notifications/[id]
 * 
 * Mark notification as read
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { inAppNotifications } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";

export const PATCH = async (request: NextRequest, { params }: { params: { id: string } }) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
    const user = { id: context.userId, organizationId: context.organizationId };

  try {
      const { id } = params;

      // Update notification
      const result = await db
        .update(inAppNotifications)
        .set({
          read: true,
          readAt: new Date(),
        })
        .where(
          and(
            eq(inAppNotifications.id, id),
            eq(inAppNotifications.user.id, user.id)
          )
        )
        .returning();

      if (result.length === 0) {
        return NextResponse.json(
          { error: 'Notification not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(result[0]);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  })
  })(request, { params });
};

export const DELETE = async (request: NextRequest, { params }: { params: { id: string } }) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
    const user = { id: context.userId, organizationId: context.organizationId };

  try {
      const { id } = params;

      // Delete notification
      const result = await db
        .delete(inAppNotifications)
        .where(
          and(
            eq(inAppNotifications.id, id),
            eq(inAppNotifications.user.id, user.id)
          )
        )
        .returning();

      if (result.length === 0) {
        return NextResponse.json(
          { error: 'Notification not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error deleting notification:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  })
  })(request, { params });
};
