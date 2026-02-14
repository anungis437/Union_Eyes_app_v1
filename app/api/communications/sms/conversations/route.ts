import { NextResponse } from 'next/server';
import { db } from '@/db';
import { smsConversations } from '@/db/schema/domains/communications';
import { and, desc, ilike, or } from 'drizzle-orm';
import { getUserContext } from '@/lib/api-auth-guard';

import { standardSuccessResponse } from '@/lib/api/standardized-responses';
type SmsConversationsContext = { params?: Record<string, unknown>; organizationId?: string; userId?: string };

export const GET = withRoleAuth<SmsConversationsContext>('member', async (request, context) => {
  try {
    const { searchParams } = new URL(request.url);
    let organizationId = searchParams.get('organizationId');
    
    if (!organizationId) {
      const userContext = await getUserContext();
      organizationId = userContext?.organizationId ?? null;
    }

    if (!organizationId) {
      return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Missing organizationId'
    );
    }

    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    let where = and(eq(smsConversations.organizationId, organizationId));

    if (status && status !== 'all') {
      where = and(where, eq(smsConversations.status, status));
    }

    if (search) {
      where = and(
        where,
        or(
          ilike(smsConversations.phoneNumber, `%${search}%`),
          ilike(smsConversations.message, `%${search}%`)
        )
      );
    }

    const conversations = await db
      .select()
      .from(smsConversations)
      .where(where)
      .orderBy(desc(smsConversations.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({ conversations });
  } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch conversations',
      error
    );
  }
});

