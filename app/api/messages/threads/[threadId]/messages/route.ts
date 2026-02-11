import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * Thread Messages API
 * Send messages in a thread
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { messageThreads, messages, messageNotifications } from '@/db/schema/domains/communications';
import { eq, and } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { put } from '@vercel/blob';
import { z } from "zod";
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { checkRateLimit, RATE_LIMITS, createRateLimitHeaders } from '@/lib/rate-limiter';
import { withRLSContext } from '@/lib/db/with-rls-context';

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';

const messagesThreadsMessagesSchema = z.object({
  content: z.unknown().optional(),
});

export const POST = async (request: NextRequest, { params }: { params: { threadId: string } }) => {
  return withRoleAuth(20, async (request, context) => {
    const { userId, organizationId } = context;

    // CRITICAL: Rate limit message sending
    const rateLimitResult = await checkRateLimit(
      `message-send:${userId}`,
      RATE_LIMITS.MESSAGE_SEND
    );

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded for messaging. Please try again later.' },
        { 
          status: 429,
          headers: createRateLimitHeaders(rateLimitResult)
        }
      );
    }

    try {
      const threadId = params.threadId;

      // Fetch thread
      const [thread] = await db
        .select()
        .from(messageThreads)
        .where(eq(messageThreads.id, threadId));

      if (!thread) {
        return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Thread not found'
    );
      }

      // Verify access
      if (thread.memberId !== userId && thread.staffId !== userId) {
        return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Forbidden'
    );
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
            return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'File too large (max 10MB)'
    );
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
    // Validate request body
    const validation = messagesThreadsMessagesSchema.safeParse(body);
    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request data',
        validation.error.errors
      );
    }
    
    const { content } = validation.data;
        content = body.content;
      }

      if (!content && !fileUrl) {
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Content or file required'
    );
      }

      // Determine sender role
      const senderRole = thread.memberId === userId ? 'member' : 'staff';

      // Create message
      const [message] = await db
        .insert(messages)
        .values({
          threadId,
          senderId: userId,
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
      const recipientId = thread.memberId === userId ? thread.staffId : thread.memberId;
      if (recipientId) {
        await withRLSContext({ organizationId }, async (db) => {
          return await db.insert(messageNotifications).values({
            userId: recipientId,
            messageId: message.id,
            threadId,
          });
        });
      }

      logger.info('Message sent', {
        threadId,
        messageId: message.id,
        senderId: userId,
        senderRole,
        messageType,
      });

      return standardSuccessResponse(
      {  message  },
      undefined,
      201
    );
    } catch (error) {
      logger.error('Failed to send message', error as Error);
      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Internal server error',
      error
    );
    }
    })(request, { params });
};
