/**
 * Activity Heatmap API
 * 
 * GET /api/analytics/heatmap
 * Returns weekly activity pattern data for heatmap visualization
 */

import { NextRequest, NextResponse } from 'next/server';
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';
import { getWeeklyActivityHeatmap } from '@/db/queries/analytics-queries';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';
import { logApiAuditEvent } from '@/lib/middleware/request-validation';

export const GET = withEnhancedRoleAuth(30, async (req: NextRequest, context) => {
  const { userId, organizationId } = context;

  // Rate limit analytics queries
  const rateLimitResult = await checkRateLimit(
    RATE_LIMITS.ANALYTICS_QUERY,
    `analytics-heatmap:${userId}`
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

    const heatmapData = await getWeeklyActivityHeatmap(tenantId);

    // Log audit event
    await logApiAuditEvent({
      userId,
      organizationId,
      action: 'heatmap_analytics_fetch',
      resourceType: 'analytics',
      resourceId: 'activity-heatmap',
      dataType: 'ANALYTICS',
    });

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
});
