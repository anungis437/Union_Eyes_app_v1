import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * Single Message Thread API
 * Get, update, or delete a specific thread
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { messageThreads, messages } from '@/db/schema/domains/communications';
import { and, desc } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { z } from "zod";
import { withEnhancedRoleAuth } from "@/lib/api-auth-guard";

import { standardSuccessResponse } from '@/lib/api/standardized-responses';
export const GET = async (request: NextRequest, { params }: { params: { threadId: string } }) => {
  return withEnhancedRoleAuth(10, async (request, context) => {
    const { userId, organizationId } = context;

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

      // Fetch messages
      const threadMessages = await db
        .select()
        .from(messages)
        .where(eq(messages.threadId, threadId))
        .orderBy(messages.createdAt);

      // Mark messages as read
      await db
        .update(messages)
        .set({ readAt: new Date(), status: 'read' })
        .where(
          and(
            eq(messages.threadId, threadId),
            eq(messages.senderId, userId)
          )
        );

      return NextResponse.json({
        thread,
        messages: threadMessages,
      });
    } catch (error) {
      logger.error('Failed to fetch thread', error as Error);
      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Internal server error',
      error
    );
    }
    })(request, { params });
};


const messagesThreadsSchema = z.object({
  status: z.unknown().optional(),
  priority: z.unknown().optional(),
  staffId: z.string().uuid('Invalid staffId'),
});

export const PATCH = async (request: NextRequest, { params }: { params: { threadId: string } }) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      const threadId = params.threadId;
      const { status, priority, staffId } = await request.json();
    // Validate request body
    const validation = messagesThreadsSchema.safeParse(body);
    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request data',
        validation.error.errors
      );
    }
    
    const { status, priority, staffId } = validation.data;

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

      // Update thread
      const updates = { updatedAt: new Date() };
      if (status) updates.status = status;
      if (priority) updates.priority = priority;
      if (staffId !== undefined) updates.staffId = staffId;

      const [updatedThread] = await db
        .update(messageThreads)
        .set(updates)
        .where(eq(messageThreads.id, threadId))
        .returning();

      logger.info('Message thread updated', {
        threadId,
        userId,
        updates,
      });

      return NextResponse.json({ thread: updatedThread });
    } catch (error) {
      logger.error('Failed to update thread', error as Error);
      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Internal server error',
      error
    );
    }
    })(request, { params });
};

export const DELETE = async (request: NextRequest, { params }: { params: { threadId: string } }) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
    const { userId, organizationId } = context;

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

      // Verify access (only member can delete their threads)
      if (thread.memberId !== userId) {
        return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Forbidden'
    );
      }

      // Archive instead of delete
      await db
        .update(messageThreads)
        .set({ isArchived: true, updatedAt: new Date() })
        .where(eq(messageThreads.id, threadId));

      logger.info('Message thread archived', {
        threadId,
        userId,
      });

      return NextResponse.json({ success: true });
    } catch (error) {
      logger.error('Failed to archive thread', error as Error);
      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Internal server error',
      error
    );
    }
    })(request, { params });
};
