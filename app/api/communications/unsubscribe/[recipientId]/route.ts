/**
 * Newsletter Unsubscribe API
 * 
 * Endpoint:
 * - POST /api/communications/unsubscribe/[recipientId] - Unsubscribe from newsletters
 * 
 * Version: 1.0.0
 * Created: December 6, 2025
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { 
  newsletterEngagement, 
  newsletterRecipients,
  newsletterListSubscribers 
} from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: { recipientId: string } }
) {
  try {
    // Get recipient
    const [recipient] = await db
      .select()
      .from(newsletterRecipients)
      .where(eq(newsletterRecipients.id, params.recipientId));

    if (!recipient) {
      return NextResponse.json({ error: 'Recipient not found' }, { status: 404 });
    }

    // Record unsubscribe event
    await db
      .insert(newsletterEngagement)
      .values({
        campaignId: recipient.campaignId,
        recipientId: params.recipientId,
        eventType: 'unsubscribe',
        occurredAt: new Date(),
        eventData: {},
      });

    // Update all list subscriptions for this email
    await db
      .update(newsletterListSubscribers)
      .set({
        status: 'unsubscribed',
        unsubscribedAt: new Date(),
      })
      .where(eq(newsletterListSubscribers.email, recipient.email));

    return NextResponse.json({ 
      success: true,
      message: 'Successfully unsubscribed from newsletters',
    });
  } catch (error) {
return NextResponse.json(
      { error: 'Failed to unsubscribe' },
      { status: 500 }
    );
  }
}

// Also support GET for one-click unsubscribe links
export async function GET(
  request: NextRequest,
  { params }: { params: { recipientId: string } }
) {
  return POST(request, { params });
}
