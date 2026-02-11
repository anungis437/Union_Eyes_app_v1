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

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
export const GET = withEnhancedRoleAuth(30, async (req: NextRequest, context) => {
  const { userId, organizationId } = context;

  // Rate limit analytics queries
  const rateLimitResult = await checkRateLimit(
    RATE_LIMITS.ANALYTICS_QUERY,
    `analytics-heatmap:${userId}`
  );

  if (!rateLimitResult.allowed) {
    return standardErrorResponse(
      ErrorCode.RATE_LIMIT_EXCEEDED,
      'Rate limit exceeded'
      // TODO: Migrate additional details: resetIn: rateLimitResult.resetIn
    );
  }

  try {
    const tenantId = organizationId;
    
    if (!tenantId) {
      return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Organization ID required'
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
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch heatmap data',
      error
    );
  }
});

