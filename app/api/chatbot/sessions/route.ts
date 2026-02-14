/**
 * Chatbot Sessions API
 * 
 * Endpoints for managing chat sessions
 * - GET /api/chatbot/sessions - List all sessions for user
 * - POST /api/chatbot/sessions - Create new session
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { chatSessions } from '@/db/schema/ai-chatbot-schema';
import { and, desc } from 'drizzle-orm';
import { withRoleAuth } from '@/lib/api-auth-guard';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/lib/logger';

export const GET = withRoleAuth('member', async (request: NextRequest, context) => {
  const { userId } = context;
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || 'active';
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');

  try {
    const sessions = await db
      .select({
        id: chatSessions.id,
        title: chatSessions.title,
        status: chatSessions.status,
        createdAt: chatSessions.createdAt,
        updatedAt: chatSessions.updatedAt,
        messageCount: chatSessions.messageCount,
      })
      .from(chatSessions)
      .where(
        and(
          eq(chatSessions.userId, userId as string),
          eq(chatSessions.status, status)
        )
      )
      .orderBy(desc(chatSessions.updatedAt))
      .limit(limit)
      .offset(offset);
    
    return NextResponse.json({
      sessions,
      pagination: { limit, offset, hasMore: sessions.length === limit },
    });
  } catch (error) {
    logger.error('Error fetching sessions:', error);
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }
});

export const POST = withRoleAuth('member', async (request: NextRequest, context) => {
  const { userId, organizationId } = context;

  try {
    const body = await request.json();
    const { title } = body;
    
    const sessionId = uuidv4();
    const [newSession] = await db.insert(chatSessions).values({
      id: sessionId,
      userId: userId as string,
      organizationId: (organizationId as string) || 'default-org',
      title: title || 'New Conversation',
      status: 'active',
      messageCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    
    return NextResponse.json({ session: newSession }, { status: 201 });
  } catch (error) {
    logger.error('Error creating session:', error);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
});
