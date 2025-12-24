/**
 * Newsletter Campaign Analytics Export API
 * 
 * Endpoint:
 * - GET /api/communications/campaigns/[id]/analytics/export - Export analytics to CSV
 * 
 * Version: 1.0.0
 * Created: December 6, 2025
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { 
  newsletterCampaigns,
  newsletterRecipients,
  newsletterEngagement 
} from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (!user.tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }

    // Get campaign
    const [campaign] = await db
      .select()
      .from(newsletterCampaigns)
      .where(
        and(
          eq(newsletterCampaigns.id, params.id),
          eq(newsletterCampaigns.organizationId, user.tenantId)
        )
      );

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Get all recipients with engagement data
    const recipients = await db
      .select({
        email: newsletterRecipients.email,
        status: newsletterRecipients.status,
        sentAt: newsletterRecipients.sentAt,
        deliveredAt: newsletterRecipients.deliveredAt,
        bounceType: newsletterRecipients.bounceType,
        bounceReason: newsletterRecipients.bounceReason,
      })
      .from(newsletterRecipients)
      .where(eq(newsletterRecipients.campaignId, params.id));

    // Get engagement events
    const engagementEvents = await db
      .select()
      .from(newsletterEngagement)
      .innerJoin(newsletterRecipients, eq(newsletterEngagement.recipientId, newsletterRecipients.id))
      .where(eq(newsletterRecipients.campaignId, params.id));

    // Build engagement map
    const engagementMap = new Map();
    for (const event of engagementEvents) {
      const email = event.newsletter_recipients.email;
      if (!engagementMap.has(email)) {
        engagementMap.set(email, { opens: 0, clicks: 0, unsubscribed: false });
      }
      const engagement = engagementMap.get(email);
      if (event.newsletter_engagement.eventType === 'open') engagement.opens++;
      if (event.newsletter_engagement.eventType === 'click') engagement.clicks++;
      if (event.newsletter_engagement.eventType === 'unsubscribe') engagement.unsubscribed = true;
    }

    // Generate CSV
    const headers = [
      'Email',
      'Status',
      'Sent At',
      'Delivered At',
      'Opens',
      'Clicks',
      'Unsubscribed',
      'Bounce Type',
      'Bounce Reason',
    ];

    const rows = recipients.map((recipient) => {
      const engagement = engagementMap.get(recipient.email) || { opens: 0, clicks: 0, unsubscribed: false };
      return [
        recipient.email,
        recipient.status,
        recipient.sentAt?.toISOString() || '',
        recipient.deliveredAt?.toISOString() || '',
        engagement.opens,
        engagement.clicks,
        engagement.unsubscribed ? 'Yes' : 'No',
        recipient.bounceType || '',
        recipient.bounceReason || '',
      ];
    });

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="campaign-${params.id}-analytics.csv"`,
      },
    });
  } catch (error) {
    console.error('Error exporting analytics:', error);
    return NextResponse.json(
      { error: 'Failed to export analytics' },
      { status: 500 }
    );
  }
}
