/**
 * Materialized Views Refresh API
 * 
 * POST /api/analytics/refresh - Refresh all analytics materialized views
 */

import { NextRequest, NextResponse } from 'next/server';
import { refreshAnalyticsViews, getViewRefreshStats } from '@/db/queries/analytics-queries';
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';
import { logApiAuditEvent } from '@/lib/middleware/request-validation';

async function postHandler(req: NextRequest, context) {
  const { userId, organizationId } = context;

  // Rate limit refresh operations
  const rateLimitResult = await checkRateLimit(
    RATE_LIMITS.DASHBOARD_REFRESH,
    `analytics-refresh:${userId}`
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
        { error: 'Tenant ID required' },
        { status: 400 }
      );
    }

    // Refresh all views
    const startTime = Date.now();
    const results = await refreshAnalyticsViews();
    const duration = Date.now() - startTime;

    // Log audit event
    await logApiAuditEvent({
      userId,
      organizationId,
      action: 'analytics_views_refresh',
      resourceType: 'analytics',
      resourceId: 'materialized-views',
      metadata: { duration, viewCount: results.length },
      dataType: 'ANALYTICS',
    });

    return NextResponse.json({
      success: true,
      refreshedViews: results.map((r: any) => ({
        viewName: r.view_name,
        status: r.refresh_status,
        durationMs: r.duration_ms,
      })),
      totalDurationMs: duration,
    });
  } catch (error) {
    console.error('Refresh views error:', error);
    return NextResponse.json(
      { error: 'Failed to refresh analytics views' },
      { status: 500 }
    );
  }
}

async function getHandler(req: NextRequest, context) {
  try {
    const organizationId = context.organizationId;
    const tenantId = organizationId;
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID required' },
        { status: 400 }
      );
    }

    const stats = await getViewRefreshStats();

    return NextResponse.json({
      views: stats.map((v: any) => ({
        schemaName: v.schemaname,
        viewName: v.matviewname,
        lastRefresh: v.last_refresh,
      })),
    });
  } catch (error) {
    console.error('Get view refresh stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch view refresh stats' },
      { status: 500 }
    );
  }
}

export const POST = withEnhancedRoleAuth(50, postHandler);
export const GET = withEnhancedRoleAuth(30, getHandler);
