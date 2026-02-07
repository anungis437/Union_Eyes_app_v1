import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * Message Notifications API
 * Manage message notifications and unread counts
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { messageNotifications, messages, messageThreads } from '@/db/schema/messages-schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { z } from "zod";
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";

export const GET = async (request: NextRequest) => {
  return withEnhancedRoleAuth(10, async (request, context) => {
    const user = { id: context.userId, organizationId: context.organizationId };

  try {
      const { searchParams } = new URL(request.url);
      const unreadOnly = searchParams.get('unread') === 'true';
      const limit = parseInt(searchParams.get('limit') || '50');
      const offset = parseInt(searchParams.get('offset') || '0');

      // Build query
      const baseCondition = eq(messageNotifications.user.id, user.id);
      const conditions = unreadOnly 
        ? and(baseCondition, eq(messageNotifications.isRead, false))
        : baseCondition;

      // Fetch notifications with message and thread details
      const notifications = await db
        .select({
          id: messageNotifications.id,
          messageId: messageNotifications.messageId,
          threadId: messageNotifications.threadId,
          isRead: messageNotifications.isRead,
          readAt: messageNotifications.readAt,
          notifiedAt: messageNotifications.notifiedAt,
          messageContent: messages.content,
          messageSenderId: messages.senderId,
          messageSenderRole: messages.senderRole,
          messageCreatedAt: messages.createdAt,
          threadSubject: messageThreads.subject,
          threadStatus: messageThreads.status,
        })
        .from(messageNotifications)
        .leftJoin(messages, eq(messageNotifications.messageId, messages.id))
        .leftJoin(messageThreads, eq(messageNotifications.threadId, messageThreads.id))
        .where(conditions)
        .orderBy(desc(messageNotifications.notifiedAt))
        .limit(limit)
        .offset(offset);

      // Get unread count
      const [unreadResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(messageNotifications)
        .where(
          and(
            eq(messageNotifications.user.id, user.id),
            eq(messageNotifications.isRead, false)
          )
        );

      return NextResponse.json({
        notifications,
        unreadCount: Number(unreadResult.count),
        pagination: {
          limit,
          offset,
          total: notifications.length,
        },
      });
    } catch (error) {
      logger.error('Failed to fetch notifications', error as Error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  })
  })(request);
};

export const PATCH = async (request: NextRequest) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
    const user = { id: context.userId, organizationId: context.organizationId };

  try {
      const { notificationIds, markAllAsRead } = await request.json();

      if (markAllAsRead) {
        // Mark all notifications as read
        await db
          .update(messageNotifications)
          .set({ isRead: true, readAt: new Date() })
          .where(
            and(
              eq(messageNotifications.user.id, user.id),
              eq(messageNotifications.isRead, false)
            )
          );

        logger.info('All notifications marked as read', { user.id });

        return NextResponse.json({ success: true });
      }

      if (!notificationIds || !Array.isArray(notificationIds)) {
        return NextResponse.json({ error: 'Notification IDs required' }, { status: 400 });
      }

      // Mark specific notifications as read
      await db
        .update(messageNotifications)
        .set({ isRead: true, readAt: new Date() })
        .where(
          and(
            eq(messageNotifications.user.id, user.id),
            sql`${messageNotifications.id} = ANY(${notificationIds})`
          )
        );

      logger.info('Notifications marked as read', {
        user.id,
        count: notificationIds.length,
      });

      return NextResponse.json({ success: true });
    } catch (error) {
      logger.error('Failed to update notifications', error as Error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  })
  })(request);
};
