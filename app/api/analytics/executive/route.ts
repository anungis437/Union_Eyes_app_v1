/**
 * Executive Analytics API
 * 
 * GET /api/analytics/executive
 * Returns high-level KPIs and summary metrics for C-suite dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';
import { getExecutiveSummary, getMonthlyTrends } from '@/db/queries/analytics-queries';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';
import { logApiAuditEvent } from '@/lib/middleware/request-validation';

export const GET = withEnhancedRoleAuth(60, async (req: NextRequest, context) => {
  const { userId, organizationId } = context;

  // Rate limit executive analytics
  const rateLimitResult = await checkRateLimit(
    RATE_LIMITS.ANALYTICS_QUERY,
    `analytics-executive:${userId}`
  );

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded', resetIn: rateLimitResult.resetIn },
      { status: 429 }
    );
  }

  try {
    const tenantId = organizationId;
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Organization ID required' },
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

    // Log audit event
    await logApiAuditEvent({
      userId,
      organizationId,
      action: 'executive_analytics_fetch',
      resourceType: 'analytics',
      resourceId: 'executive-summary',
      metadata: { daysBack },
      dataType: 'ANALYTICS',
    });

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
return NextResponse.json(
      { error: 'Failed to fetch executive analytics' },
      { status: 500 }
    );
  }
});

