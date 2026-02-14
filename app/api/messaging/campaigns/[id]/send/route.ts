/**
 * Send Campaign API Route
 * 
 * POST /api/messaging/campaigns/[id]/send - Send or schedule campaign
 * 
 * Phase 4: Communications & Organizing
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { campaigns } from '@/db/schema';
import { and } from 'drizzle-orm';
import { withRLSContext } from '@/lib/db/rls-context';
import { auth } from '@clerk/nextjs/server';
import { getCampaignService } from '@/lib/services/messaging/campaign-service';
import { getEmailService } from '@/lib/services/messaging/email-service';
import { getSMSService } from '@/lib/services/messaging/sms-service';

/**
 * POST /api/messaging/campaigns/[id]/send
 * Send campaign or preview (dry run)
 */
export async function POST(
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
    const dryRun = body.dryRun || false;

    // Check campaign exists and belongs to org
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

    // Validate campaign status
    if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
      return NextResponse.json(
        { error: `Cannot send campaign with status: ${campaign.status}` },
        { status: 400 }
      );
    }

    // Validate campaign has content
    if (!campaign.body && !campaign.templateId) {
      return NextResponse.json(
        { error: 'Campaign must have content or template' },
        { status: 400 }
      );
    }

    // Initialize campaign service
    const emailService = getEmailService();
    const smsService = getSMSService();
    const campaignService = getCampaignService(emailService, smsService);

    // Send campaign (or dry run)
    const result = await campaignService.sendCampaign({
      campaignId: id,
      userId,
      dryRun,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error sending campaign:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send campaign' },
      { status: 500 }
    );
  }
}
