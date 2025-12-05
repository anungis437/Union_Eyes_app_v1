/**
 * Message Threads API
 * List and create message threads
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db/db';
import { messageThreads, messages, messageParticipants } from '@/db/schema/messages-schema';
import { eq, and, desc, or, sql } from 'drizzle-orm';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
    const threads = await db
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

    // Get unread counts for each thread
    const threadIds = threads.map(t => t.id);
    const unreadCounts = await db
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { subject, staffId, organizationId, category, priority, initialMessage } = await request.json();

    if (!subject || !organizationId) {
      return NextResponse.json({ error: 'Subject and organization ID required' }, { status: 400 });
    }

    // Create thread
    const [thread] = await db
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

    // Add creator as participant
    await db.insert(messageParticipants).values({
      threadId: thread.id,
      userId,
      role: 'member',
    });

    // Add staff as participant if specified
    if (staffId) {
      await db.insert(messageParticipants).values({
        threadId: thread.id,
        userId: staffId,
        role: 'staff',
      });
    }

    // Create initial message if provided
    if (initialMessage) {
      await db.insert(messages).values({
        threadId: thread.id,
        senderId: userId,
        senderRole: 'member',
        messageType: 'text',
        content: initialMessage,
      });
    }

    logger.info('Message thread created', {
      threadId: thread.id,
      memberId: userId,
      organizationId,
    });

    return NextResponse.json({ thread }, { status: 201 });
  } catch (error) {
    logger.error('Failed to create message thread', error as Error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
