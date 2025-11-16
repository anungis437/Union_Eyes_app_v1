/**
 * Materialized Views Refresh API
 * 
 * POST /api/analytics/refresh - Refresh all analytics materialized views
 */

import { NextRequest, NextResponse } from 'next/server';
import { withTenantAuth } from '@/lib/tenant-middleware';
import { refreshAnalyticsViews, getViewRefreshStats } from '@/db/queries/analytics-queries';

async function postHandler(req: NextRequest) {
  try {
    const tenantId = req.headers.get('x-tenant-id');
    
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

async function getHandler(req: NextRequest) {
  try {
    const tenantId = req.headers.get('x-tenant-id');
    
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

export const POST = withTenantAuth(postHandler);
export const GET = withTenantAuth(getHandler);
