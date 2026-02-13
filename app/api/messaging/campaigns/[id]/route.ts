/**
 * Campaign Detail API Routes
 * 
 * GET    /api/messaging/campaigns/[id] - Get campaign
 * PUT    /api/messaging/campaigns/[id] - Update campaign
 * DELETE /api/messaging/campaigns/[id] - Delete campaign
 * 
 * Phase 4: Communications & Organizing
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { campaigns } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { withRLSContext } from '@/lib/db/rls-context';
import { auth } from '@clerk/nextjs/server';

/**
 * GET /api/messaging/campaigns/[id]
 * Get campaign details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, orgId } = await auth();
    const { id } = await params;

    if (!userId || !orgId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const campaign = await withRLSContext(async () => {
      const [result] = await db
        .select()
        .from(campaigns)
        .where(
          and(
            eq(campaigns.id, id),
            eq(campaigns.organizationId, orgId)
          )
        )
        .limit(1);

      return result;
    }, { organizationId: orgId, userId });

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(campaign);
  } catch (error) {
    console.error('Error fetching campaign:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaign' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/messaging/campaigns/[id]
 * Update campaign
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, orgId } = await auth();
    const { id } = await params;

    if (!userId || !orgId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();

    const campaign = await withRLSContext(async () => {
      // Check campaign exists and belongs to org
      const [existing] = await db
        .select()
        .from(campaigns)
        .where(
          and(
            eq(campaigns.id, id),
            eq(campaigns.organizationId, orgId)
          )
        )
        .limit(1);

      if (!existing) {
        throw new Error('Campaign not found');
      }

      // Only allow updates if campaign is in draft or scheduled status
      if (existing.status !== 'draft' && existing.status !== 'scheduled') {
        throw new Error(`Cannot update campaign with status: ${existing.status}`);
      }

      // Update campaign
      const [updated] = await db
        .update(campaigns)
        .set({
          name: body.name || existing.name,
          description: body.description !== undefined ? body.description : existing.description,
          subject: body.subject !== undefined ? body.subject : existing.subject,
          body: body.body !== undefined ? body.body : existing.body,
          variables: body.variables || existing.variables,
          scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : existing.scheduledAt,
          sendImmediately: body.sendImmediately !== undefined ? body.sendImmediately : existing.sendImmediately,
          settings: body.settings || existing.settings,
          metadata: body.metadata || existing.metadata,
          tags: body.tags || existing.tags,
          updatedBy: userId,
          updatedAt: new Date(),
        })
        .where(eq(campaigns.id, id))
        .returning();

      return updated;
    }, { organizationId: orgId, userId });

    return NextResponse.json(campaign);
  } catch (error) {
    console.error('Error updating campaign:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update campaign' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/messaging/campaigns/[id]
 * Delete campaign (only if draft)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, orgId } = await auth();
    const { id } = await params;

    if (!userId || !orgId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await withRLSContext(async () => {
      // Check campaign exists and is draft
      const [existing] = await db
        .select()
        .from(campaigns)
        .where(
          and(
            eq(campaigns.id, id),
            eq(campaigns.organizationId, orgId)
          )
        )
        .limit(1);

      if (!existing) {
        throw new Error('Campaign not found');
      }

      if (existing.status !== 'draft') {
        throw new Error('Only draft campaigns can be deleted');
      }

      // Delete campaign
      await db
        .delete(campaigns)
        .where(eq(campaigns.id, id));
    }, { organizationId: orgId, userId });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete campaign' },
      { status: 500 }
    );
  }
}
