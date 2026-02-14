/**
 * Support SLA Metrics API Route
 * 
 * Provides Service Level Agreement compliance metrics.
 * Part of Phase 2 - App Operations Roles implementation.
 * 
 * Authentication: Minimum role level 260 (support_manager)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';
import { checkRateLimit, createRateLimitHeaders } from '@/lib/rate-limiter';
import { logApiAuditEvent } from '@/lib/middleware/api-security';
import { standardSuccessResponse,
} from '@/lib/api/standardized-responses';
import { getSLAMetrics } from '@/lib/services/support-service';
import { logger } from '@/lib/logger';
import { z } from 'zod';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const slaQuerySchema = z.object({
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  organization_id: z.string().uuid().optional(),
  priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  category: z.string().optional(),
});

// ============================================================================
// GET /api/support/sla
// Get SLA compliance metrics
// ============================================================================

export const GET = async (request: NextRequest) => {
  return withEnhancedRoleAuth(260, async (request, context) => {
    const { userId } = context;

    try {
      // Rate limiting
      const rateLimitResult = await checkRateLimit(userId, {
        limit: 50,
        window: 60,
        identifier: 'support-sla-read',
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
        priority: searchParams.get('priority') || undefined,
        category: searchParams.get('category') || undefined,
      };

      // Validate query parameters
      const validation = slaQuerySchema.safeParse(queryParams);
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

      // Get SLA metrics
      const slaMetrics = await getSLAMetrics({
        organizationId: filters.organization_id,
        priority: filters.priority,
        category: filters.category,
        startDate,
        endDate,
      });

      // Audit log
      await logApiAuditEvent({
        action: 'support.sla.read',
        userId,
        resourceType: 'sla_metrics',
        severity: 'info',
        metadata: { filters },
      });

      logger.info('SLA metrics retrieved', { userId, filters });

      return standardSuccessResponse({
        sla: slaMetrics,
        period: {
          start: startDate?.toISOString(),
          end: endDate?.toISOString(),
        },
        complianceThreshold: 95, // 95% SLA compliance target
        status:
          slaMetrics.complianceRate >= 95
            ? 'good'
            : slaMetrics.complianceRate >= 85
            ? 'warning'
            : 'critical',
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error retrieving SLA metrics', { error, userId });
      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        'Failed to retrieve SLA metrics'
      );
    }
  })(request, {});
};
