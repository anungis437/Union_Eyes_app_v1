import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * Thread Messages API
 * Send messages in a thread
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { messageThreads, messages, messageNotifications } from '@/db/schema/messages-schema';
import { eq, and } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { put } from '@vercel/blob';
import { z } from "zod";
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";

export const POST = async (request: NextRequest, { params }: { params: { threadId: string } }) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
    const user = { id: context.userId, organizationId: context.organizationId };

  try {
      const threadId = params.threadId;

      // Fetch thread
      const [thread] = await db
        .select()
        .from(messageThreads)
        .where(eq(messageThreads.id, threadId));

      if (!thread) {
        return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
      }

      // Verify access
      if (thread.memberId !== user.id && thread.staffId !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const contentType = request.headers.get('content-type');
      let content: string | undefined;
      let fileUrl: string | undefined;
      let fileName: string | undefined;
      let fileSize: string | undefined;
      let messageType: 'text' | 'file' = 'text';

      // Handle file upload
      if (contentType?.includes('multipart/form-data')) {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const messageContent = formData.get('content') as string;

        if (file) {
          // Validate file (10MB max)
          if (file.size > 10 * 1024 * 1024) {
            return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
          }

          // Upload to Vercel Blob
          const blob = await put(`messages/${threadId}/${Date.now()}-${file.name}`, file, {
            access: 'public',
          });

          fileUrl = blob.url;
          fileName = file.name;
          fileSize = `${(file.size / 1024).toFixed(2)} KB`;
          messageType = 'file';
          content = messageContent || `Shared file: ${file.name}`;
        }
      } else {
        const body = await request.json();
        content = body.content;
      }

      if (!content && !fileUrl) {
        return NextResponse.json({ error: 'Content or file required' }, { status: 400 });
      }

      // Determine sender role
      const senderRole = thread.memberId === user.id ? 'member' : 'staff';

      // Create message
      const [message] = await db
        .insert(messages)
        .values({
          threadId,
          senderId: user.id,
          senderRole,
          messageType,
          content,
          fileUrl,
          fileName,
          fileSize,
        })
        .returning();

      // Update thread last message time
      await db
        .update(messageThreads)
        .set({ lastMessageAt: new Date(), updatedAt: new Date() })
        .where(eq(messageThreads.id, threadId));

      // Create notification for recipient
      const recipientId = thread.memberId === user.id ? thread.staffId : thread.memberId;
      if (recipientId) {
        await db.insert(messageNotifications).values({
          user.id: recipientId,
          messageId: message.id,
          threadId,
        });
      }

      logger.info('Message sent', {
        threadId,
        messageId: message.id,
        senderId: user.id,
        senderRole,
        messageType,
      });

      return NextResponse.json({ message }, { status: 201 });
    } catch (error) {
      logger.error('Failed to send message', error as Error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  })
  })(request, { params });
};
