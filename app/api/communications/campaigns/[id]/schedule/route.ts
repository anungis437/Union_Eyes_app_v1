/**
 * Newsletter Campaign Schedule API
 * 
 * Endpoint:
 * - POST /api/communications/campaigns/[id]/schedule - Schedule or send campaign
 * 
 * Version: 1.0.0
 * Created: December 6, 2025
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { 
  newsletterCampaigns, 
  newsletterRecipients,
  newsletterListSubscribers 
} from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { logApiAuditEvent } from '@/lib/middleware/request-validation';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';

const scheduleSchema = z.object({
  scheduledAt: z.string().nullable(),
  timezone: z.string().default('UTC'),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withRoleAuth('steward', async (request, context) => {
    try {
      const { userId, organizationId } = context;

      if (!organizationId) {
        return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
      }

      // Rate limit check
      const rateLimitResult = await checkRateLimit(
        RATE_LIMITS.CAMPAIGN_OPERATIONS,
        `campaign-schedule:${userId}`
      );
      if (!rateLimitResult.allowed) {
        return NextResponse.json(
          { error: 'Rate limit exceeded', resetIn: rateLimitResult.resetIn },
          { status: 429 }
        );
      }

    const body = await request.json();
    const { scheduledAt, timezone } = scheduleSchema.parse(body);

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

    if (!['draft', 'scheduled'].includes(campaign.status || '')) {
      return NextResponse.json(
        { error: 'Campaign cannot be scheduled in current status' },
        { status: 400 }
      );
    }

    // Get all subscribers from distribution lists
    const subscribers = await db
      .select()
      .from(newsletterListSubscribers)
      .where(
        and(
          inArray(newsletterListSubscribers.listId, campaign.distributionListIds || []),
          eq(newsletterListSubscribers.status, 'subscribed')
        )
      );

    if (subscribers.length === 0) {
      return NextResponse.json(
        { error: 'No active subscribers found in distribution lists' },
        { status: 400 }
      );
    }

    // Create recipient records
    const recipientsToInsert = subscribers.map((sub) => ({
      campaignId: params.id,
      profileId: sub.profileId,
      email: sub.email,
      status: 'pending' as const,
    }));

    await db
      .insert(newsletterRecipients)
      .values(recipientsToInsert)
      .onConflictDoNothing();

    // Update campaign
    const newStatus = scheduledAt ? 'scheduled' : 'sending';
    const [updatedCampaign] = await db
      .update(newsletterCampaigns)
      .set({
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        timezone,
        status: newStatus,
        totalSent: subscribers.length,
      })
      .where(eq(newsletterCampaigns.id, params.id))
      .returning();

    // If sending now, trigger email sending
    if (!scheduledAt) {
      const { sendEmail } = await import('@/lib/email-service');
      
      // Send emails in batches to avoid overwhelming the service
      const BATCH_SIZE = 50;
      let sentCount = 0;
      let failedCount = 0;

      for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
        const batch = subscribers.slice(i, i + BATCH_SIZE);
        
        const results = await Promise.allSettled(
          batch.map(async (subscriber) => {
            const result = await sendEmail({
              to: [{ email: subscriber.email, name: subscriber.email }],
              subject: campaign.subject || 'Newsletter',
              html: campaign.content || '<p>Newsletter content</p>',
              replyTo: process.env.EMAIL_REPLY_TO,
            });

            // Update recipient status
            await db
              .update(newsletterRecipients)
              .set({
                status: result.success ? 'sent' : 'failed',
                sentAt: result.success ? new Date() : null,
                errorMessage: result.error || null,
              })
              .where(
                and(
                  eq(newsletterRecipients.campaignId, params.id),
                  eq(newsletterRecipients.email, subscriber.email)
                )
              );

            return result;
          })
        );

        sentCount += results.filter(
          (r) => r.status === 'fulfilled' && r.value.success
        ).length;
        failedCount += results.filter(
          (r) => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)
        ).length;

        // Small delay between batches to respect rate limits
        if (i + BATCH_SIZE < subscribers.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Update campaign with final counts
      await db
        .update(newsletterCampaigns)
        .set({
          status: 'sent',
          totalSent: sentCount,
          totalFailed: failedCount,
          sentAt: new Date(),
        })
        .where(eq(newsletterCampaigns.id, params.id));
}
    // If scheduled, add to job queue with delay
    // Note: In production, use a proper job queue like BullMQ or similar
    else {
}

    // Audit log
    await logApiAuditEvent({
      userId,
      organizationId,
      action: scheduledAt ? 'SCHEDULE_CAMPAIGN' : 'SEND_CAMPAIGN',
      dataType: 'CAMPAIGNS',
      recordId: params.id,
      success: true,
      metadata: { scheduledAt, recipientCount: subscribers.length },
    });

    return NextResponse.json({ 
      campaign: updatedCampaign,
      recipientCount: subscribers.length,
      message: scheduledAt 
        ? 'Campaign scheduled successfully'
        : 'Campaign is being sent',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
return NextResponse.json(
      { error: 'Failed to schedule campaign' },
      { status: 500 }
    );
  }
  })(request);
}
