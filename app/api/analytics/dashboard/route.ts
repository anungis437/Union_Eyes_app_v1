import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { claims, claimUpdates } from '@/db/schema/domains/claims';
import { desc, and, count, between } from 'drizzle-orm';
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';
import { withRLSContext } from '@/lib/db/with-rls-context';

import { standardSuccessResponse } from '@/lib/api/standardized-responses';
export const GET = async (request: NextRequest) => {
  return withEnhancedRoleAuth(30, async (request, context) => {
    const { userId, organizationId } = context;

    // Rate limit dashboard analytics
    const rateLimitResult = await checkRateLimit(
      RATE_LIMITS.ANALYTICS_QUERY,
      `analytics-dashboard:${userId}`
    );

    if (!rateLimitResult.allowed) {
      return standardErrorResponse(
      ErrorCode.RATE_LIMIT_EXCEEDED,
      'Rate limit exceeded'
      // TODO: Migrate additional details: resetIn: rateLimitResult.resetIn
    );
    }

    try {
      const { searchParams } = new URL(request.url);
      const timeRange = searchParams.get('timeRange') || '30'; // days
      const memberId = searchParams.get('memberId'); // Optional: filter by specific member

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(timeRange));

      // Build where conditions
      const whereConditions = [];
      
      if (memberId) {
        whereConditions.push(eq(claims.memberId, memberId));
      }

      whereConditions.push(gte(claims.createdAt, startDate));

      // Get overall statistics
      const [overallStats] = await withRLSContext({ organizationId }, async (db) => {
        return await db
          .select({
            totalClaims: count(),
            activeClaims: sql<number>`COUNT(CASE WHEN status NOT IN ('resolved', 'rejected', 'closed') THEN 1 END)`,
            resolvedClaims: sql<number>`COUNT(CASE WHEN status = 'resolved' THEN 1 END)`,
            rejectedClaims: sql<number>`COUNT(CASE WHEN status = 'rejected' THEN 1 END)`,
            underReview: sql<number>`COUNT(CASE WHEN status = 'under_review' THEN 1 END)`,
            investigation: sql<number>`COUNT(CASE WHEN status = 'investigation' THEN 1 END)`,
            criticalPriority: sql<number>`COUNT(CASE WHEN priority = 'critical' THEN 1 END)`,
            highPriority: sql<number>`COUNT(CASE WHEN priority = 'high' THEN 1 END)`,
          })
          .from(claims)
          .where(and(...whereConditions));
      });

      // Get claims by type
      const claimsByType = await withRLSContext({ organizationId }, async (db) => {
        return await db
          .select({
            claimType: claims.claimType,
            count: count(),
          })
          .from(claims)
          .where(and(...whereConditions))
          .groupBy(claims.claimType);
      });

      // Get claims by status
      const claimsByStatus = await withRLSContext({ organizationId }, async (db) => {
        return await db
          .select({
            status: claims.status,
            count: count(),
          })
          .from(claims)
          .where(and(...whereConditions))
          .groupBy(claims.status);
      });

      // Get claims by priority
      const claimsByPriority = await withRLSContext({ organizationId }, async (db) => {
        return await db
          .select({
            priority: claims.priority,
            count: count(),
          })
          .from(claims)
          .where(and(...whereConditions))
          .groupBy(claims.priority);
      });

      // Get average resolution time for resolved claims
      const [resolutionStats] = await withRLSContext({ organizationId }, async (db) => {
        return await db
          .select({
            avgResolutionDays: sql<number>`AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400)`,
            minResolutionDays: sql<number>`MIN(EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400)`,
            maxResolutionDays: sql<number>`MAX(EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400)`,
          })
          .from(claims)
          .where(
            and(
              eq(claims.status, 'resolved'),
              gte(claims.createdAt, startDate)
            )
          );
      });

      // Get claims trend (daily for last 30 days)
      const claimsTrend = await withRLSContext({ organizationId }, async (db) => {
        return await db
          .select({
            date: sql<string>`DATE(created_at)`,
            count: count(),
          })
          .from(claims)
          .where(and(...whereConditions))
          .groupBy(sql`DATE(created_at)`)
          .orderBy(sql`DATE(created_at)`);
      });

      // Calculate performance metrics
      const resolutionRate = overallStats.totalClaims > 0
        ? ((overallStats.resolvedClaims / overallStats.totalClaims) * 100).toFixed(1)
        : '0.0';

      const activeRate = overallStats.totalClaims > 0
        ? ((overallStats.activeClaims / overallStats.totalClaims) * 100).toFixed(1)
        : '0.0';

      // Log audit event
      await logApiAuditEvent({
        userId,
        organizationId,
        action: 'dashboard_analytics_fetch',
        resourceType: 'analytics',
        resourceId: 'claims-dashboard',
        metadata: { timeRange: parseInt(timeRange), memberId },
        dataType: 'ANALYTICS',
      });

      return NextResponse.json({
        timeRange: parseInt(timeRange),
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        overview: {
          total: overallStats.totalClaims || 0,
          active: overallStats.activeClaims || 0,
          resolved: overallStats.resolvedClaims || 0,
          rejected: overallStats.rejectedClaims || 0,
          underReview: overallStats.underReview || 0,
          investigation: overallStats.investigation || 0,
          critical: overallStats.criticalPriority || 0,
          high: overallStats.highPriority || 0,
        },
        performance: {
          resolutionRate: parseFloat(resolutionRate),
          activeRate: parseFloat(activeRate),
          avgResolutionDays: resolutionStats.avgResolutionDays 
            ? Math.round(resolutionStats.avgResolutionDays * 10) / 10 
            : null,
          minResolutionDays: resolutionStats.minResolutionDays 
            ? Math.round(resolutionStats.minResolutionDays * 10) / 10 
            : null,
          maxResolutionDays: resolutionStats.maxResolutionDays 
            ? Math.round(resolutionStats.maxResolutionDays * 10) / 10 
            : null,
        },
        distribution: {
          byType: claimsByType,
          byStatus: claimsByStatus,
          byPriority: claimsByPriority,
        },
        trend: claimsTrend,
      });
    } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Internal server error',
      error
    );
    }
    })(request);
};

