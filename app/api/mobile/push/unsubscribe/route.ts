/**
 * Push Unsubscription API
 * 
 * Handles push notification unsubscription
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { getAuth } from '@clerk/nextjs/server';
import { db } from '@/db/db';
import { pushSubscriptions } from '@/db/schema/mobile-devices-schema';
import { eq } from 'drizzle-orm';

const unsubscriptionSchema = z.object({
  endpoint: z.string().url(),
});

/**
 * POST /api/mobile/push/unsubscribe
 * Remove push subscription
 */
export async function POST(request: NextRequest) {
  try {
    const auth = getAuth(request);
    
    if (!auth?.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = unsubscriptionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 400 }
      );
    }

    const { endpoint } = validation.data;

    // Delete subscription
    await db
      .delete(pushSubscriptions)
      .where(
        eq(pushSubscriptions.endpoint, endpoint)
      );

    logger.info('Push subscription removed', { 
      userId: auth.userId,
      endpoint: endpoint.substring(0, 50) 
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to remove push subscription', { error });
    return NextResponse.json(
      { error: 'Failed to remove subscription' },
      { status: 500 }
    );
  }
}
