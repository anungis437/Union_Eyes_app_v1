/**
 * Cross-Tenant Analytics API Route
 * 
 * Provides analytics across all tenants for analytics admin dashboard.
 * Part of Phase 2 - App Operations Roles implementation.
 * 
 * Authentication: Minimum role level 270 (data_analytics_manager)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';
import { checkRateLimit, createRateLimitHeaders } from '@/lib/rate-limiter';
import { logApiAuditEvent } from '@/lib/middleware/api-security';
import {
  standardErrorResponse,
  standardSuccessResponse,
  ErrorCode,
} from '@/lib/api/standardized-responses';
import { logger } from '@/lib/logger';
import { db } from '@/database';
import { organizations } from '@/db/schema-organizations';
import { users } from '@/db/schema/domains/member';
import { count, sql } from 'drizzle-orm';
import { z } from 'zod';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const crossTenantQuerySchema = z.object({
  metric_type: z
    .enum(['organizations', 'users', 'activity', 'storage', 'all'])
    .default('all'),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  include_inactive: z.boolean().default(false),
});

// ============================================================================
// GET /api/analytics/cross-tenant
// Get cross-tenant analytics
// ============================================================================

export const GET = async (request: NextRequest) => {
  return withEnhancedRoleAuth(270, async (request, context) => {
    const { userId } = context;

    try {
      // Rate limiting
      const rateLimitResult = await checkRateLimit(userId, {
        limit: 30,
        window: 60,
        identifier: 'cross-tenant-analytics',
      });

      if (!rateLimitResult.allowed) {
        return NextResponse.json(
          {
            error: 'Rate limit exceeded',
            resetIn: rateLimitResult.resetIn,
          },
          {
            status: 429,
            headers: createRateLimitHeaders(rateLimitResult),
          }
        );
      }

      const { searchParams } = new URL(request.url);

      // Parse query parameters
      const queryParams = {
        metric_type: searchParams.get('metric_type') || 'all',
        start_date: searchParams.get('start_date') || undefined,
        end_date: searchParams.get('end_date') || undefined,
        include_inactive: searchParams.get('include_inactive') === 'true',
      };

      // Validate query parameters
      const validation = crossTenantQuerySchema.safeParse(queryParams);
      if (!validation.success) {
        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          'Invalid query parameters',
          validation.error.errors
        );
      }

      const { metric_type, start_date, end_date, include_inactive } = validation.data;

      // Build analytics data
      const analytics: any = {
        generatedAt: new Date().toISOString(),
        period: {
          start: start_date,
          end: end_date,
        },
      };

      // Get organization metrics
      if (metric_type === 'organizations' || metric_type === 'all') {
        const orgMetrics = await db
          .select({
            total: count(),
            byType: sql<string>`${organizations.organizationType}`,
          })
          .from(organizations)
          .groupBy(organizations.organizationType);

        analytics.organizations = {
          total: orgMetrics.reduce((sum, m) => sum + Number(m.total), 0),
          byType: orgMetrics.map((m) => ({
            type: m.byType,
            count: Number(m.total),
          })),
        };
      }

      // Get user metrics
      if (metric_type === 'users' || metric_type === 'all') {
        const userMetrics = await db
          .select({
            total: count(),
          })
          .from(users);

        analytics.users = {
          total: Number(userMetrics[0]?.total || 0),
        };
      }

      // Get activity metrics (placeholder - would integrate with actual activity tracking)
      if (metric_type === 'activity' || metric_type === 'all') {
        analytics.activity = {
          dailyActive: 0, // Would come from session tracking
          weeklyActive: 0,
          monthlyActive: 0,
          peakHours: [],
        };
      }

      // Get storage metrics (placeholder - would integrate with actual storage tracking)
      if (metric_type === 'storage' || metric_type === 'all') {
        analytics.storage = {
          totalGB: 0, // Would come from document storage service
          byOrganization: [],
        };
      }

      // Audit log
      await logApiAuditEvent({
        action: 'analytics.cross_tenant.read',
        userId,
        resourceType: 'analytics',
        severity: 'info',
        metadata: { metric_type },
      });

      logger.info('Cross-tenant analytics retrieved', { userId, metric_type });

      return standardSuccessResponse({ analytics });
    } catch (error) {
      logger.error('Error retrieving cross-tenant analytics', { error, userId });
      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        'Failed to retrieve cross-tenant analytics'
      );
    }
  })(request, {});
};
