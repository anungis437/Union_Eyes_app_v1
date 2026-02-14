/**
 * Campaigns API Routes
 * 
 * POST /api/messaging/campaigns - Create campaign
 * GET  /api/messaging/campaigns - List campaigns
 * 
 * Phase 4: Communications & Organizing
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { campaigns, messageTemplates } from '@/db/schema';
import { desc, and } from 'drizzle-orm';
import { withRLSContext } from '@/lib/db/rls-context';
import { auth } from '@clerk/nextjs/server';

/**
 * GET /api/messaging/campaigns
 * List campaigns with pagination and filters
 */
export async function GET(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const status = searchParams.get('status');
    const channel = searchParams.get('channel');

    const offset = (page - 1) * pageSize;

    const result = await withRLSContext(async () => {
      // Build where conditions
      const whereConditions = [eq(campaigns.organizationId, orgId)];

      if (status) {
        whereConditions.push(eq(campaigns.status, status));
      }

      if (channel) {
        whereConditions.push(eq(campaigns.channel, channel));
      }

      // Get campaigns
      const campaignsList = await db
        .select({
          id: campaigns.id,
          name: campaigns.name,
          description: campaigns.description,
          type: campaigns.type,
          channel: campaigns.channel,
          status: campaigns.status,
          audienceCount: campaigns.audienceCount,
          scheduledAt: campaigns.scheduledAt,
          sentAt: campaigns.sentAt,
          completedAt: campaigns.completedAt,
          stats: campaigns.stats,
          createdBy: campaigns.createdBy,
          createdAt: campaigns.createdAt,
          updatedAt: campaigns.updatedAt,
        })
        .from(campaigns)
        .where(and(...whereConditions))
        .orderBy(desc(campaigns.createdAt))
        .limit(pageSize)
        .offset(offset);

      // Get total count
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(campaigns)
        .where(and(...whereConditions));

      return {
        campaigns: campaignsList,
        pagination: {
          page,
          pageSize,
          total: count,
          totalPages: Math.ceil(count / pageSize),
        },
      };
    }, { organizationId: orgId, userId });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaigns' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/messaging/campaigns
 * Create new campaign
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.channel || !body.type) {
      return NextResponse.json(
        { error: 'Missing required fields: name, channel, type' },
        { status: 400 }
      );
    }

    const campaign = await withRLSContext(async () => {
      // Validate template exists if templateId provided
      if (body.templateId) {
        const [template] = await db
          .select({ id: messageTemplates.id })
          .from(messageTemplates)
          .where(
            and(
              eq(messageTemplates.id, body.templateId),
              eq(messageTemplates.organizationId, orgId)
            )
          )
          .limit(1);

        if (!template) {
          throw new Error('Template not found');
        }
      }

      // Create campaign
      const [newCampaign] = await db
        .insert(campaigns)
        .values({
          organizationId: orgId,
          name: body.name,
          description: body.description,
          type: body.type,
          channel: body.channel,
          templateId: body.templateId || null,
          segmentId: body.segmentId || null,
          segmentQuery: body.segmentQuery || null,
          subject: body.subject || null,
          body: body.body || null,
          variables: body.variables || {},
          scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
          sendImmediately: body.sendImmediately || false,
          timezone: body.timezone || 'America/Toronto',
          settings: body.settings || {
            trackOpens: true,
            trackClicks: true,
            respectQuietHours: true,
            quietHoursStart: '22:00',
            quietHoursEnd: '08:00',
            maxRetriesOnFail: 3,
            batchSize: 100,
          },
          metadata: body.metadata || {},
          tags: body.tags || [],
          status: 'draft',
          createdBy: userId,
        })
        .returning();

      return newCampaign;
    }, { organizationId: orgId, userId });

    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    console.error('Error creating campaign:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create campaign' },
      { status: 500 }
    );
  }
}
