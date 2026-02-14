/**
 * SMS Campaigns API
 * 
 * Endpoints:
 * - GET /api/communications/sms/campaigns - List all SMS campaigns for organization
 * 
 * Version: 1.0.0
 * Created: February 10, 2026
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { smsCampaigns } from '@/db/schema';
import { desc } from 'drizzle-orm';
import { withOrganizationAuth } from '@/lib/organization-middleware';

import { standardSuccessResponse } from '@/lib/api/standardized-responses';
export const GET = withOrganizationAuth(async (request: NextRequest, context) => {
  try {
    const { organizationId } = context;

    // Fetch campaigns with computed stats
    const campaigns = await db
      .select({
        id: smsCampaigns.id,
        name: smsCampaigns.name,
        description: smsCampaigns.description,
        status: smsCampaigns.status,
        recipientCount: smsCampaigns.recipientCount,
        sentCount: smsCampaigns.sentCount,
        deliveredCount: smsCampaigns.deliveredCount,
        failedCount: smsCampaigns.failedCount,
        totalCost: smsCampaigns.totalCost,
        scheduledFor: smsCampaigns.scheduledFor,
        startedAt: smsCampaigns.startedAt,
        completedAt: smsCampaigns.completedAt,
        cancelledAt: smsCampaigns.cancelledAt,
        createdAt: smsCampaigns.createdAt,
        updatedAt: smsCampaigns.updatedAt,
      })
      .from(smsCampaigns)
      .where(eq(smsCampaigns.organizationId, organizationId))
      .orderBy(desc(smsCampaigns.createdAt));

    // Calculate derived metrics
    const campaignsWithMetrics = campaigns.map((campaign) => {
      const sentCount = campaign.sentCount ?? 0;
      const deliveredCount = campaign.deliveredCount ?? 0;
      const failedCount = campaign.failedCount ?? 0;
      const totalCost = parseFloat(campaign.totalCost || '0');

      return {
        ...campaign,
        successRate: sentCount > 0
          ? Math.round((deliveredCount / sentCount) * 100)
          : 0,
        failureRate: sentCount > 0
          ? Math.round((failedCount / sentCount) * 100)
          : 0,
        costPerMessage: sentCount > 0
          ? (totalCost / sentCount).toFixed(4)
          : '0.0000',
      };
    });

    return NextResponse.json({ campaigns: campaignsWithMetrics });
  } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch campaigns',
      error
    );
  }
});
