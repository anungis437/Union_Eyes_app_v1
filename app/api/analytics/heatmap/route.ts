/**
 * Activity Heatmap API
 * 
 * GET /api/analytics/heatmap
 * Returns weekly activity pattern data for heatmap visualization
 */

import { NextRequest, NextResponse } from 'next/server';
import { withOrganizationAuth } from '@/lib/organization-middleware';
import { getWeeklyActivityHeatmap } from '@/db/queries/analytics-queries';
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";

async function handler(req: NextRequest, context) {
  try {
    const organizationId = context.organizationId;
    const tenantId = organizationId;
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID required' },
        { status: 400 }
      );
    }

    const heatmapData = await getWeeklyActivityHeatmap(tenantId);

    return NextResponse.json({
      heatmapData,
    });
  } catch (error) {
    console.error('Heatmap analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch heatmap data' },
      { status: 500 }
    );
  }
}

export const GET = withOrganizationAuth(handler);
