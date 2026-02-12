/**
 * Support Metrics API Route
 * 
 * Provides support team performance metrics and analytics.
 * Part of Phase 2 - App Operations Roles implementation.
 * 
 * Authentication: Minimum role level 260 (support_manager)
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
import { getTicketMetrics } from '@/lib/services/support-service';
import { logger } from '@/lib/logger';
import { z } from 'zod';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const metricsQuerySchema = z.object({
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  organization_id: z.string().uuid().optional(),
  assigned_to: z.string().uuid().optional(),
});

// ============================================================================
// GET /api/support/metrics
// Get support metrics
// ============================================================================

export const GET = async (request: NextRequest) => {
  return withEnhancedRoleAuth(260, async (request, context) => {
    const { userId } = context;

    try {
      // Rate limiting
      const rateLimitResult = await checkRateLimit(userId, {
        limit: 50,
        window: 60,
        identifier: 'support-metrics-read',
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
        start_date: searchParams.get('start_date') || undefined,
        end_date: searchParams.get('end_date') || undefined,
        organization_id: searchParams.get('organization_id') || undefined,
        assigned_to: searchParams.get('assigned_to') || undefined,
      };

      // Validate query parameters
      const validation = metricsQuerySchema.safeParse(queryParams);
      if (!validation.success) {
        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          'Invalid query parameters',
          validation.error.errors
        );
      }

      const filters = validation.data;

      // Parse dates if provided
      const startDate = filters.start_date ? new Date(filters.start_date) : undefined;
      const endDate = filters.end_date ? new Date(filters.end_date) : undefined;

      // Get metrics
      const metrics = await getTicketMetrics({
        organizationId: filters.organization_id,
        assignedTo: filters.assigned_to,
        startDate,
        endDate,
      });

      // Audit log
      await logApiAuditEvent({
        action: 'support.metrics.read',
        userId,
        resourceType: 'support_metrics',
        severity: 'info',
        metadata: { filters },
      });

      logger.info('Support metrics retrieved', { userId, filters });

      return standardSuccessResponse({
        metrics,
        period: {
          start: startDate?.toISOString(),
          end: endDate?.toISOString(),
        },
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error retrieving support metrics', { error, userId });
      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        'Failed to retrieve support metrics'
      );
    }
  })(request, {});
};
