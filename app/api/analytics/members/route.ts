/**
 * Member Analytics API
 * 
 * GET /api/analytics/members
 * Returns member engagement metrics, retention, and cohort analysis
 */

import { NextRequest, NextResponse } from 'next/server';
import { withTenantAuth } from '@/lib/tenant-middleware';
import { getMemberAnalytics } from '@/db/queries/analytics-queries';
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";

async function handler(req: NextRequest, context) {
  try {
    const tenantId = context.tenantId;
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID required' },
        { status: 400 }
      );
    }

    const url = new URL(req.url);
    const daysBack = parseInt(url.searchParams.get('days') || '90');
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const analytics = await getMemberAnalytics(tenantId, { startDate, endDate });

    return NextResponse.json({
      analytics,
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        daysBack,
      },
    });
  } catch (error) {
    console.error('Member analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch member analytics' },
      { status: 500 }
    );
  }
}

export const GET = withTenantAuth(handler);
