/**
 * Member Analytics API
 * 
 * GET /api/analytics/members
 * Returns member engagement metrics, retention, and cohort analysis
 */

import { NextRequest, NextResponse } from 'next/server';
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';
import { getMemberAnalytics } from '@/db/queries/analytics-queries';
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
    `analytics-members:${userId}`
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

    const url = new URL(req.url);
    const daysBack = parseInt(url.searchParams.get('days') || '90');
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const analytics = await getMemberAnalytics(tenantId, { startDate, endDate });

    // Log audit event
    await logApiAuditEvent({
      userId,
      organizationId,
      action: 'member_analytics_fetch',
      resourceType: 'analytics',
      resourceId: 'member-analytics',
      metadata: { daysBack },
      dataType: 'ANALYTICS',
    });

    return NextResponse.json({
      analytics,
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        daysBack,
      },
    });
  } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch member analytics',
      error
    );
  }
});

