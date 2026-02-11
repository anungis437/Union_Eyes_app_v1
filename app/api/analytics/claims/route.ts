/**
 * Claims Analytics API
 * 
 * GET /api/analytics/claims
 * Returns comprehensive claims metrics, trends, and breakdowns with period comparison
 */

import { NextRequest, NextResponse } from 'next/server';
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';
import { sql, db } from '@/db';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';
import { logApiAuditEvent } from '@/lib/middleware/request-validation';

export const GET = withEnhancedRoleAuth(30, async (req: NextRequest, context) => {
  const { userId, organizationId } = context;

  // Rate limit claims analytics
  const rateLimitResult = await checkRateLimit(
    RATE_LIMITS.ANALYTICS_QUERY,
    `analytics-claims:${userId}`
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

    const url = new URL(req.url);
    const daysBack = parseInt(url.searchParams.get('days') || '30');
    const includeDetails = url.searchParams.get('details') === 'true';
    
    // Parse optional filters
    const filters: any = {};
    if (url.searchParams.get('status')) {
      filters.status = url.searchParams.get('status')!.split(',');
    }
    if (url.searchParams.get('claimType')) {
      filters.claimType = url.searchParams.get('claimType')!.split(',');
    }
    if (url.searchParams.get('priority')) {
      filters.priority = url.searchParams.get('priority')!.split(',');
    }
    if (url.searchParams.get('assignedTo')) {
      filters.assignedTo = url.searchParams.get('assignedTo')!;
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    // Get comprehensive analytics with breakdowns
    const [totalResult, statusBreakdown, typeBreakdown, priorityBreakdown, resolutionMetrics] = await Promise.all([
      // Total claims
      db.execute(sql`
        SELECT COUNT(*) as total_claims
        FROM claims
        WHERE organization_id = ${tenantId}
          AND created_at >= ${startDate}
          AND created_at <= ${endDate}
      `),
      
      // Status breakdown
      db.execute(sql`
        SELECT status, COUNT(*) as count
        FROM claims
        WHERE organization_id = ${tenantId}
          AND created_at >= ${startDate}
          AND created_at <= ${endDate}
        GROUP BY status
      `),
      
      // Claim type breakdown
      db.execute(sql`
        SELECT claim_type, COUNT(*) as count
        FROM claims
        WHERE organization_id = ${tenantId}
          AND created_at >= ${startDate}
          AND created_at <= ${endDate}
        GROUP BY claim_type
        ORDER BY count DESC
      `),
      
      // Priority breakdown
      db.execute(sql`
        SELECT priority, COUNT(*) as count
        FROM claims
        WHERE organization_id = ${tenantId}
          AND created_at >= ${startDate}
          AND created_at <= ${endDate}
        GROUP BY priority
      `),
      
      // Resolution metrics
      db.execute(sql`
        SELECT 
          COUNT(*) FILTER (WHERE status = 'resolved') as resolved_count,
          COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count,
          AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 86400) FILTER (WHERE resolved_at IS NOT NULL) as avg_resolution_days
        FROM claims
        WHERE organization_id = ${tenantId}
          AND created_at >= ${startDate}
          AND created_at <= ${endDate}
      `)
    ]);

    const analytics = {
      totalClaims: Number((totalResult as any)[0]?.total_claims || 0),
      period: { startDate, endDate },
      byStatus: (statusBreakdown as any[]).reduce((acc: any, row: any) => {
        acc[row.status] = Number(row.count);
        return acc;
      }, {}),
      byType: (typeBreakdown as any[]).map((row: any) => ({
        type: row.claim_type,
        count: Number(row.count)
      })),
      byPriority: (priorityBreakdown as any[]).reduce((acc: any, row: any) => {
        acc[row.priority] = Number(row.count);
        return acc;
      }, {}),
      resolution: {
        resolved: Number((resolutionMetrics as any)[0]?.resolved_count || 0),
        rejected: Number((resolutionMetrics as any)[0]?.rejected_count || 0),
        avgResolutionDays: Math.round(Number((resolutionMetrics as any)[0]?.avg_resolution_days || 0))
      }
    };
    
    // Log audit event
    await logApiAuditEvent({
      userId,
      organizationId,
      action: 'claims_analytics_fetch',
      resourceType: 'analytics',
      resourceId: 'claims-metrics',
      metadata: { daysBack, includeDetails, filters },
      dataType: 'ANALYTICS',
    });
    return NextResponse.json({
      analytics,
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        daysBack,
      },
      filters: Object.keys(filters).length > 0 ? filters : null,
    });
  } catch (error) {
return NextResponse.json(
      { error: 'Failed to fetch claims analytics' },
      { status: 500 }
    );
  }
});

// Helper function to get claims by date range
async function getClaimsByDateRange(
  tenantId: string,
  dateRange: { startDate: Date; endDate: Date },
  filters: any
) {
  const { startDate, endDate } = dateRange;
  
  let query = sql`
    SELECT 
      claim_id,
      claim_number,
      claim_type,
      status,
      priority,
      assigned_to,
      incident_date,
      created_at,
      resolved_at,
      claim_amount,
      settlement_amount
    FROM claims
    WHERE organization_id = ${tenantId}
      AND created_at >= ${startDate}
      AND created_at <= ${endDate}
  `;

  // Apply filters
  if (filters.status && filters.status.length > 0) {
    query = sql`${query} AND status = ANY(${filters.status})`;
  }
  if (filters.claimType && filters.claimType.length > 0) {
    query = sql`${query} AND claim_type = ANY(${filters.claimType})`;
  }
  if (filters.priority && filters.priority.length > 0) {
    query = sql`${query} AND priority = ANY(${filters.priority})`;
  }
  if (filters.assignedTo) {
    query = sql`${query} AND assigned_to = ${filters.assignedTo}`;
  }

  query = sql`${query} ORDER BY created_at DESC`;

  const result = await db.execute(query);
  return result as any[];
}

