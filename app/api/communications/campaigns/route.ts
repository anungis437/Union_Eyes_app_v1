/**
 * Newsletter Campaigns API
 * 
 * Endpoints:
 * - GET /api/communications/campaigns - List all campaigns
 * - POST /api/communications/campaigns - Create new campaign
 * 
 * Version: 1.0.0
 * Created: December 6, 2025
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { newsletterCampaigns, newsletterTemplates, newsletterDistributionLists } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { logApiAuditEvent } from '@/lib/middleware/request-validation';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';

const createCampaignSchema = z.object({
  name: z.string().min(1, 'Campaign name is required'),
  subject: z.string().min(1, 'Subject is required'),
  previewText: z.string().optional(),
  fromName: z.string().min(1, 'From name is required'),
  fromEmail: z.string().email('Valid from email is required'),
  replyToEmail: z.string().email().optional(),
  htmlContent: z.string().min(1, 'Content is required'),
  templateId: z.string().optional(),
  distributionListIds: z.array(z.string()).min(1, 'At least one distribution list required'),
  scheduledAt: z.string().optional(),
  timezone: z.string().optional(),
});

export const GET = withRoleAuth(20, async (request: NextRequest, context) => {
  try {
    const { userId, organizationId } = context;

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
    }

    // Rate limit check
    const rateLimitResult = await checkRateLimit(
      RATE_LIMITS.CAMPAIGN_OPERATIONS,
      `campaign-read:${userId}`
    );
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', resetIn: rateLimitResult.resetIn },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let query = db
      .select({
        campaign: newsletterCampaigns,
        template: newsletterTemplates,
      })
      .from(newsletterCampaigns)
      .leftJoin(newsletterTemplates, eq(newsletterCampaigns.templateId, newsletterTemplates.id))
      .where(eq(newsletterCampaigns.organizationId, organizationId))
      .$dynamic();

    if (status) {
      query = query.where(eq(newsletterCampaigns.status, status as any));
    }

    const campaigns = await query.orderBy(desc(newsletterCampaigns.createdAt));

    // Audit log
    await logApiAuditEvent({
      userId,
      organizationId,
      action: 'LIST_CAMPAIGNS',
      dataType: 'CAMPAIGNS',
      success: true,
      metadata: { count: campaigns.length, status },
    });

    return NextResponse.json({ campaigns });
  } catch (error) {
return NextResponse.json(
      { error: 'Failed to fetch campaigns' },
      { status: 500 }
    );
  }
});

export const POST = withRoleAuth('member', async (request: NextRequest, context) => {
  try {
    const { userId, organizationId } = context;

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
    }

    // Rate limit check
    const rateLimitResult = await checkRateLimit(
      RATE_LIMITS.CAMPAIGN_OPERATIONS,
      `campaign-ops:${userId}`
    );
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', resetIn: rateLimitResult.resetIn },
        { status: 429 }
      );
    }

    const body = await request.json();
    const validatedData = createCampaignSchema.parse(body);

    // Verify distribution lists exist
    const lists = await db
      .select()
      .from(newsletterDistributionLists)
      .where(eq(newsletterDistributionLists.organizationId, organizationId));

    const validListIds = lists.map(l => l.id);
    const invalidListIds = validatedData.distributionListIds.filter(
      id => !validListIds.includes(id)
    );

    if (invalidListIds.length > 0) {
      return NextResponse.json(
        { error: 'Invalid distribution list IDs', invalidListIds },
        { status: 400 }
      );
    }

    // Calculate total recipients from all lists
    const totalRecipients = lists
      .filter(l => validatedData.distributionListIds.includes(l.id))
      .reduce((sum, l) => sum + (l.subscriberCount || 0), 0);

    const [campaign] = await db
      .insert(newsletterCampaigns)
      .values({
        organizationId,
        createdBy: userId,
        name: validatedData.name,
        subject: validatedData.subject,
        previewText: validatedData.previewText,
        fromName: validatedData.fromName,
        fromEmail: validatedData.fromEmail,
        replyToEmail: validatedData.replyToEmail,
        htmlContent: validatedData.htmlContent,
        templateId: validatedData.templateId,
        distributionListIds: validatedData.distributionListIds,
        scheduledAt: validatedData.scheduledAt ? new Date(validatedData.scheduledAt) : null,
        timezone: validatedData.timezone || 'UTC',
        status: validatedData.scheduledAt ? 'scheduled' : 'draft',
      })
      .returning();

    // Audit log
    await logApiAuditEvent({
      userId,
      organizationId,
      action: 'CREATE_CAMPAIGN',
      dataType: 'CAMPAIGNS',
      recordId: campaign.id,
      success: true,
      metadata: { name: campaign.name, status: campaign.status },
    });

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
return NextResponse.json(
      { error: 'Failed to create campaign' },
      { status: 500 }
    );
  }
});

