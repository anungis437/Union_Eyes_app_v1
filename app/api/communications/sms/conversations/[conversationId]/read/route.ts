import { NextResponse } from 'next/server';
import { db } from '@/db';
import { smsConversations } from '@/db/schema/domains/communications';
import { and, eq } from 'drizzle-orm';
import { withRoleAuth } from '@/lib/api-auth-guard';

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
type SmsConversationContext = { params: { conversationId: string }; organizationId?: string };

export const POST = withRoleAuth<SmsConversationContext>('steward', async (request, authContext) => {
  try {
    const { conversationId } = authContext.params;
    const organizationId = authContext.organizationId;

    if (!organizationId) {
      return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Missing organizationId'
    );
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
      return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Conversation not found'
    );
    }

    return NextResponse.json({ conversation });
  } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to mark conversation read',
      error
    );
  }
});
