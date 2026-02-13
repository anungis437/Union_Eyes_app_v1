/**
 * Push Subscription API
 * 
 * Handles push notification subscription management
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { getAuth } from '@clerk/nextjs/server';
import { db } from '@/db/db';
import { pushSubscriptions } from '@/db/schema/mobile-devices-schema';

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
});

/**
 * POST /api/mobile/push/subscribe
 * Save push subscription
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
    const validation = subscriptionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid subscription', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { endpoint, keys } = validation.data;

    // Store subscription
    const [subscription] = await db
      .insert(pushSubscriptions)
      .values({
        userId: auth.userId,
        endpoint,
        p256dhKey: keys.p256dh,
        authKey: keys.auth,
        createdAt: new Date(),
      })
      .onConflictDoUpdate({
        target: pushSubscriptions.endpoint,
        set: {
          p256dhKey: keys.p256dh,
          authKey: keys.auth,
          updatedAt: new Date(),
        },
      })
      .returning();

    logger.info('Push subscription saved', { 
      userId: auth.userId, 
      endpoint: endpoint.substring(0, 50) 
    });

    return NextResponse.json({ 
      success: true, 
      subscriptionId: subscription.id 
    }, { status: 201 });
  } catch (error) {
    logger.error('Failed to save push subscription', { error });
    return NextResponse.json(
      { error: 'Failed to save subscription' },
      { status: 500 }
    );
  }
}
