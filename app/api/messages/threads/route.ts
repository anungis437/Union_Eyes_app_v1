import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * Message Threads API
 * List and create message threads
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { withRLSContext } from '@/lib/db/with-rls-context';
import { messageThreads, messages, messageParticipants } from '@/db/schema/domains/communications';
import { eq, and, desc, or, sql } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { z } from "zod";
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { checkRateLimit, RATE_LIMITS, createRateLimitHeaders } from '@/lib/rate-limiter';

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
export const GET = async (request: NextRequest) => {
  return withRoleAuth(10, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      const { searchParams } = new URL(request.url);
      const status = searchParams.get('status');
      const limit = parseInt(searchParams.get('limit') || '50');
      const offset = parseInt(searchParams.get('offset') || '0');

      // Build query conditions
      let conditions = and(
        eq(messageThreads.isArchived, false),
        or(
          eq(messageThreads.memberId, userId),
          eq(messageThreads.staffId, userId)
        )
      );

      if (status) {
        conditions = and(conditions, eq(messageThreads.status, status));
      }

      // Fetch threads with last message and unread count
      const threads = await withRLSContext({ organizationId }, async (db) => {
        return await db
          .select({
            id: messageThreads.id,
            subject: messageThreads.subject,
            memberId: messageThreads.memberId,
            staffId: messageThreads.staffId,
            organizationId: messageThreads.organizationId,
            status: messageThreads.status,
            priority: messageThreads.priority,
            category: messageThreads.category,
            lastMessageAt: messageThreads.lastMessageAt,
            createdAt: messageThreads.createdAt,
            updatedAt: messageThreads.updatedAt,
          })
          .from(messageThreads)
          .where(conditions)
          .orderBy(desc(messageThreads.lastMessageAt))
          .limit(limit)
          .offset(offset);
      });

      // Get unread counts for each thread
      const threadIds = threads.map(t => t.id);
      const unreadCounts = await withRLSContext({ organizationId }, async (db) => {
        return await db
          .select({
            threadId: messages.threadId,
            count: sql<number>`count(*)`.as('count'),
          })
          .from(messages)
          .where(
            and(
              sql`${messages.threadId} = ANY(${threadIds})`,
              sql`${messages.senderId} != ${userId}`,
              sql`${messages.readAt} IS NULL`
            )
          )
          .groupBy(messages.threadId);
      });

      const unreadMap = Object.fromEntries(
        unreadCounts.map(u => [u.threadId, Number(u.count)])
      );

      return NextResponse.json({
        threads: threads.map(thread => ({
          ...thread,
          unreadCount: unreadMap[thread.id] || 0,
        })),
        pagination: {
          limit,
          offset,
          total: threads.length,
        },
      });
    } catch (error) {
      logger.error('Failed to fetch message threads', error as Error);
      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Internal server error',
      error
    );
    }
    })(request);
};


const messagesThreadsSchema = z.object({
  subject: z.unknown().optional(),
  staffId: z.string().uuid('Invalid staffId'),
  organizationId: z.string().uuid('Invalid organizationId'),
  category: z.unknown().optional(),
  priority: z.unknown().optional(),
  initialMessage: z.unknown().optional(),
});

export const POST = async (request: NextRequest) => {
  return withRoleAuth(20, async (request, context) => {
    const { userId, organizationId } = context;
    // Rate limit message thread creation
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
      const { subject, staffId, organizationId, category, priority, initialMessage } = await request.json();
    // Validate request body
    const validation = messagesThreadsSchema.safeParse(body);
    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request data',
        validation.error.errors
      );
    }
    
    const { subject, staffId, organizationId, category, priority, initialMessage } = validation.data;

      if (!subject || !organizationId) {
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Subject and organization ID required'
    );
      }

      // Create thread
      const [thread] = await withRLSContext({ organizationId }, async (db) => {
        return await db
          .insert(messageThreads)
          .values({
            subject,
            memberId: userId,
            staffId: staffId || null,
            organizationId,
            category: category || 'general',
            priority: priority || 'normal',
            lastMessageAt: new Date(),
          })
          .returning();
      });

      // Add creator as participant
      await withRLSContext({ organizationId }, async (db) => {
        return await db.insert(messageParticipants).values({
          threadId: thread.id,
          userId,
          role: 'member',
        });
      });

      // Add staff as participant if specified
      if (staffId) {
        await withRLSContext({ organizationId }, async (db) => {
          return await db.insert(messageParticipants).values({
            threadId: thread.id,
            userId: staffId,
            role: 'staff',
          });
        });
      }

      // Create initial message if provided
      if (initialMessage) {
        await withRLSContext(
          { userId, organizationId },
          async (db) => db.insert(messages).values({
            threadId: thread.id,
            senderId: userId,
            senderRole: 'member',
            messageType: 'text',
            content: initialMessage,
          })
        );
      }

      logger.info('Message thread created', {
        threadId: thread.id,
        memberId: userId,
        organizationId,
      });

      return standardSuccessResponse(
      {  thread  },
      undefined,
      201
    );
    } catch (error) {
      logger.error('Failed to create message thread', error as Error);
      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Internal server error',
      error
    );
    }
    })(request);
};

