/**
 * Chatbot Session Messages API
 * 
 * Endpoints for getting messages in a session
 * - GET /api/chatbot/sessions/[sessionId]/messages - Get all messages in a session
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { chatSessions, chatMessages } from '@/db/schema/ai-chatbot-schema';
import { and, asc } from 'drizzle-orm';
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';
import { logger } from '@/lib/logger';

type MessagesResponse = {
  messages?: Array<Record<string, unknown>>;
  error?: string;
};

export const GET = async (
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
): Promise<NextResponse<MessagesResponse>> => {
  const { sessionId } = await params;
  
  return withEnhancedRoleAuth<MessagesResponse>(10, async (request, context) => {
    const { userId } = context;
    
    try {
      // Validate session belongs to user
      const [session] = await db
        .select()
        .from(chatSessions)
        .where(
          and(
            eq(chatSessions.id, sessionId),
            eq(chatSessions.userId, userId)
          )
        );
      
      if (!session) {
        return NextResponse.json(
          { error: 'Chat session not found' },
          { status: 404 }
        );
      }
      
      // Get messages
      const messages = await db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.sessionId, sessionId))
        .orderBy(asc(chatMessages.createdAt));
      
      return NextResponse.json({ messages });
    } catch (error) {
      logger.error('Error fetching messages:', error);
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      );
    }
  })(request);
};
