/**
 * Single Message Thread API
 * Get, update, or delete a specific thread
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db/db';
import { messageThreads, messages } from '@/db/schema/messages-schema';
import { eq, and, desc } from 'drizzle-orm';
import { logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: { threadId: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
    if (thread.memberId !== userId && thread.staffId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { threadId: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const threadId = params.threadId;
    const { status, priority, staffId } = await request.json();

    // Fetch thread
    const [thread] = await db
      .select()
      .from(messageThreads)
      .where(eq(messageThreads.id, threadId));

    if (!thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    // Verify access
    if (thread.memberId !== userId && thread.staffId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update thread
    const updates: any = { updatedAt: new Date() };
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { threadId: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const threadId = params.threadId;

    // Fetch thread
    const [thread] = await db
      .select()
      .from(messageThreads)
      .where(eq(messageThreads.id, threadId));

    if (!thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    // Verify access (only member can delete their threads)
    if (thread.memberId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
