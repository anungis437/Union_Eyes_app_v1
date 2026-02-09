/**
 * Newsletter Campaign Analytics API
 * 
 * Endpoint:
 * - GET /api/communications/campaigns/[id]/analytics - Get campaign analytics
 * 
 * Version: 1.0.0
 * Created: December 6, 2025
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { 
  newsletterCampaigns,
  newsletterEngagement,
  newsletterRecipients 
} from '@/db/schema';
import { eq, and, sql, gte } from 'drizzle-orm';
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';
import { logApiAuditEvent } from '@/lib/middleware/request-validation';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withEnhancedRoleAuth(20, async (request, context) => {
    try {
      const { userId, organizationId } = context;

      if (!organizationId) {
        return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
      }

      // Rate limit check
      const rateLimitResult = await checkRateLimit(
        RATE_LIMITS.CAMPAIGN_OPERATIONS,
        `campaign-analytics:${userId}`
      );
      if (!rateLimitResult.allowed) {
        return NextResponse.json(
          { error: 'Rate limit exceeded', resetIn: rateLimitResult.resetIn },
          { status: 429 }
        );
      }

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || 'all';

      // Get campaign
      const [campaign] = await db
        .select()
        .from(newsletterCampaigns)
        .where(
          and(
            eq(newsletterCampaigns.id, params.id),
            eq(newsletterCampaigns.organizationId, organizationId)
          )
        );

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Calculate date filter based on range
    let dateFilter = undefined;
    if (range !== 'all') {
      const now = new Date();
      const hours = range === '24h' ? 24 : range === '7d' ? 168 : 720; // 30d
      const cutoff = new Date(now.getTime() - hours * 60 * 60 * 1000);
      dateFilter = gte(newsletterEngagement.occurredAt, cutoff);
    }

    // Get link clicks
    const linkClicksQuery = db
      .select({
        url: sql<string>`event_data->>'url'`,
        clicks: sql<number>`count(*)`,
        uniqueClicks: sql<number>`count(DISTINCT ${newsletterRecipients.id})`,
      })
      .from(newsletterEngagement)
      .innerJoin(newsletterRecipients, eq(newsletterEngagement.recipientId, newsletterRecipients.id))
      .where(
        and(
          eq(newsletterRecipients.campaignId, params.id),
          eq(newsletterEngagement.eventType, 'click'),
          dateFilter
        )
      )
      .groupBy(sql`event_data->>'url'`)
      .orderBy(sql`count(*) DESC`)
      .limit(10);

    const linkClicks = await linkClicksQuery;

    // Get geographic data
    const geographicQuery = db
      .select({
        country: sql<string>`event_data->'location'->>'country'`,
        opens: sql<number>`count(CASE WHEN event_type = 'open' THEN 1 END)`,
        clicks: sql<number>`count(CASE WHEN event_type = 'click' THEN 1 END)`,
      })
      .from(newsletterEngagement)
      .innerJoin(newsletterRecipients, eq(newsletterEngagement.recipientId, newsletterRecipients.id))
      .where(
        and(
          eq(newsletterRecipients.campaignId, params.id),
          dateFilter
        )
      )
      .groupBy(sql`event_data->'location'->>'country'`)
      .orderBy(sql`count(*) DESC`)
      .limit(10);

    const geographic = await geographicQuery;

    // Get device data
    const devicesQuery = db
      .select({
        deviceType: sql<string>`event_data->'device'->>'type'`,
        opens: sql<number>`count(*)`,
        percentage: sql<number>`count(*)::float / sum(count(*)) OVER ()`,
      })
      .from(newsletterEngagement)
      .innerJoin(newsletterRecipients, eq(newsletterEngagement.recipientId, newsletterRecipients.id))
      .where(
        and(
          eq(newsletterRecipients.campaignId, params.id),
          eq(newsletterEngagement.eventType, 'open'),
          dateFilter
        )
      )
      .groupBy(sql`event_data->'device'->>'type'`);

    const devices = await devicesQuery;

    // Get engagement timeline (by hour)
    const timelineQuery = db
      .select({
        hour: sql<number>`extract(hour from occurred_at)`,
        opens: sql<number>`count(CASE WHEN event_type = 'open' THEN 1 END)`,
        clicks: sql<number>`count(CASE WHEN event_type = 'click' THEN 1 END)`,
      })
      .from(newsletterEngagement)
      .innerJoin(newsletterRecipients, eq(newsletterEngagement.recipientId, newsletterRecipients.id))
      .where(
        and(
          eq(newsletterRecipients.campaignId, params.id),
          dateFilter
        )
      )
      .groupBy(sql`extract(hour from occurred_at)`)
      .orderBy(sql`extract(hour from occurred_at)`);

    const timeline = await timelineQuery;

    // Calculate stats
    const stats = {
      deliveryRate: (campaign.totalDelivered || 0) / (campaign.totalSent || 1),
      openRate: (campaign.totalOpened || 0) / (campaign.totalDelivered || 1),
      clickRate: (campaign.totalClicked || 0) / (campaign.totalDelivered || 1),
      bounceRate: (campaign.totalBounced || 0) / (campaign.totalSent || 1),
      unsubscribeRate: (campaign.totalUnsubscribed || 0) / (campaign.totalDelivered || 1),
      spamReportRate: (campaign.totalSpamReports || 0) / (campaign.totalDelivered || 1),
    };

    // Audit log
    await logApiAuditEvent({
      userId,
      organizationId,
      action: 'VIEW_CAMPAIGN_ANALYTICS',
      dataType: 'CAMPAIGNS',
      recordId: params.id,
      success: true,
      metadata: { range },
    });

    return NextResponse.json({
      campaign: {
        ...campaign,
        stats,
      },
      linkClicks,
      geographic,
      devices,
      timeline,
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
  })(request);
}
