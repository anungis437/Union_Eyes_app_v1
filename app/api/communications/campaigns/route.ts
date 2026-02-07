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
import { getCurrentUser } from '@/lib/auth';

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

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { tenantId } = user;

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
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
      .where(eq(newsletterCampaigns.organizationId, tenantId))
      .$dynamic();

    if (status) {
      query = query.where(eq(newsletterCampaigns.status, status as any));
    }

    const campaigns = await query.orderBy(desc(newsletterCampaigns.createdAt));

    return NextResponse.json({ campaigns });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaigns' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id: userId, tenantId } = user;

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createCampaignSchema.parse(body);

    // Verify distribution lists exist
    const lists = await db
      .select()
      .from(newsletterDistributionLists)
      .where(eq(newsletterDistributionLists.organizationId, tenantId));

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
        organizationId: tenantId,
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

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating campaign:', error);
    return NextResponse.json(
      { error: 'Failed to create campaign' },
      { status: 500 }
    );
  }
}
