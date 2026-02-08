/**
 * Executive Analytics API
 * 
 * GET /api/analytics/executive
 * Returns high-level KPIs and summary metrics for C-suite dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { withOrganizationAuth } from '@/lib/organization-middleware';
import { getExecutiveSummary, getMonthlyTrends } from '@/db/queries/analytics-queries';
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

    // Get date range from query params (default: last 30 days)
    const url = new URL(req.url);
    const daysBack = parseInt(url.searchParams.get('days') || '30');
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    // Get executive summary with period comparison
    const summary = await getExecutiveSummary(tenantId, { startDate, endDate });

    // Get monthly trends for the past 12 months
    const trends = await getMonthlyTrends(tenantId, 12);

    return NextResponse.json({
      summary,
      trends,
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        daysBack,
      },
    });
  } catch (error) {
    console.error('Executive analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch executive analytics' },
      { status: 500 }
    );
  }
}

export const GET = withOrganizationAuth(handler);
