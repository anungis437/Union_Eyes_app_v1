/**
 * Deadline Analytics API
 * 
 * GET /api/analytics/deadlines
 * Returns deadline compliance metrics and trends
 */

import { NextRequest, NextResponse } from 'next/server';
import { withOrganizationAuth } from '@/lib/organization-middleware';
import { getDeadlineAnalytics } from '@/db/queries/analytics-queries';
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

    const url = new URL(req.url);
    const daysBack = parseInt(url.searchParams.get('days') || '30');
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const analytics = await getDeadlineAnalytics(tenantId, { startDate, endDate });

    return NextResponse.json({
      analytics,
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        daysBack,
      },
    });
  } catch (error) {
    console.error('Deadline analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch deadline analytics' },
      { status: 500 }
    );
  }
}

export const GET = withOrganizationAuth(handler);
