import { NextResponse } from 'next/server';
import { db } from '@/db';
import { smsConversations } from '@/db/schema/sms-communications-schema';
import { and, eq } from 'drizzle-orm';
import { withRoleAuth } from '@/lib/api-auth-guard';

type SmsConversationContext = { params: { conversationId: string }; organizationId?: string };

export const POST = withRoleAuth<SmsConversationContext>(10, async (request, authContext) => {
  try {
    const { conversationId } = authContext.params;
    const organizationId = authContext.organizationId;

    if (!organizationId) {
      return NextResponse.json({ error: 'Missing organizationId' }, { status: 400 });
    }

    const [conversation] = await db
      .update(smsConversations)
      .set({
        status: 'read',
        readAt: new Date(),
      })
      .where(and(eq(smsConversations.id, conversationId), eq(smsConversations.organizationId, organizationId)))
      .returning();

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    return NextResponse.json({ conversation });
  } catch (error) {
    console.error('Error marking SMS conversation read:', error);
    return NextResponse.json(
      { error: 'Failed to mark conversation read' },
      { status: 500 }
    );
  }
});
