/**
 * Newsletter Campaign Detail API
 * 
 * Endpoints:
 * - GET /api/communications/campaigns/[id] - Get campaign by ID
 * - PUT /api/communications/campaigns/[id] - Update campaign
 * - DELETE /api/communications/campaigns/[id] - Delete campaign
 * 
 * Version: 1.0.0
 * Created: December 6, 2025
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { newsletterCampaigns } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

const updateCampaignSchema = z.object({
  name: z.string().min(1).optional(),
  subject: z.string().min(1).optional(),
  preheader: z.string().optional(),
  htmlContent: z.string().min(1).optional(),
  distributionListIds: z.array(z.string()).optional(),
  scheduledAt: z.string().optional(),
  timezone: z.string().optional(),
  status: z.enum(['draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled']).optional(),
});

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

    return NextResponse.json({ campaign });
  } catch (error) {
    console.error('Error fetching campaign:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaign' },
      { status: 500 }
    );
  }
}

export async function PUT(
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

    const body = await request.json();
    const validatedData = updateCampaignSchema.parse(body);

    // Check if campaign can be edited
    const [existing] = await db
      .select()
      .from(newsletterCampaigns)
      .where(
        and(
          eq(newsletterCampaigns.id, params.id),
          eq(newsletterCampaigns.organizationId, user.tenantId)
        )
      );

    if (!existing) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    if (['sending', 'sent'].includes(existing.status || '')) {
      return NextResponse.json(
        { error: 'Cannot modify campaign that is sending or already sent' },
        { status: 403 }
      );
    }

    const updateData: any = { ...validatedData };
    if (validatedData.scheduledAt) {
      updateData.scheduledAt = new Date(validatedData.scheduledAt);
    }

    const [campaign] = await db
      .update(newsletterCampaigns)
      .set(updateData)
      .where(eq(newsletterCampaigns.id, params.id))
      .returning();

    return NextResponse.json({ campaign });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating campaign:', error);
    return NextResponse.json(
      { error: 'Failed to update campaign' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    // Check if campaign can be deleted
    const [existing] = await db
      .select()
      .from(newsletterCampaigns)
      .where(
        and(
          eq(newsletterCampaigns.id, params.id),
          eq(newsletterCampaigns.organizationId, user.tenantId)
        )
      );

    if (!existing) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    if (existing.status === 'sending') {
      return NextResponse.json(
        { error: 'Cannot delete campaign while sending' },
        { status: 403 }
      );
    }

    await db
      .delete(newsletterCampaigns)
      .where(eq(newsletterCampaigns.id, params.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    return NextResponse.json(
      { error: 'Failed to delete campaign' },
      { status: 500 }
    );
  }
}
