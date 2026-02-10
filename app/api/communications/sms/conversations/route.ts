import { NextResponse } from 'next/server';
import { db } from '@/db';
import { smsConversations } from '@/db/schema/sms-communications-schema';
import { and, desc, eq, ilike, or } from 'drizzle-orm';
import { withRoleAuth, getUserContext } from '@/lib/api-auth-guard';

type SmsConversationsContext = { params?: Record<string, any>; organizationId?: string; userId?: string };

export const GET = withRoleAuth<SmsConversationsContext>('member', async (request, context) => {
  try {
    const { searchParams } = new URL(request.url);
    let organizationId = searchParams.get('organizationId') ?? searchParams.get('tenantId');
    
    if (!organizationId) {
      const userContext = await getUserContext();
      organizationId = userContext?.organizationId ?? null;
    }

    if (!organizationId) {
      return NextResponse.json({ error: 'Missing organizationId' }, { status: 400 });
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
    console.error('Error fetching SMS conversations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
});
