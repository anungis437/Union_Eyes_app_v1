/**
 * Security Events API Route
 * 
 * Provides security event monitoring for security officers.
 * Part of Phase 3 - App Operations Roles implementation.
 * 
 * Authentication: Minimum role level 310 (security_officer)
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
import { securityEvents } from '@/db/schema/domains/infrastructure/audit';
import { and, eq, gte, lte, desc, inArray } from 'drizzle-orm';
import { z } from 'zod';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const securityEventsQuerySchema = z.object({
  event_type: z.string().optional(),
  event_category: z
    .enum(['authentication', 'authorization', 'data_access', 'configuration', 'suspicious'])
    .optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  user_id: z.string().optional(),
  organization_id: z.string().uuid().optional(),
  is_resolved: z.boolean().optional(),
  min_risk_score: z.number().int().min(0).max(100).optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  limit: z.number().int().min(1).max(500).default(100),
  offset: z.number().int().min(0).default(0),
});

// ============================================================================
// GET /api/security/events
// Get security events
// ============================================================================

export const GET = async (request: NextRequest) => {
  return withEnhancedRoleAuth(310, async (request, context) => {
    const { userId } = context;

    try {
      // Rate limiting
      const rateLimitResult = await checkRateLimit(userId, {
        limit: 50,
        window: 60,
        identifier: 'security-events-read',
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
        event_type: searchParams.get('event_type') || undefined,
        event_category: searchParams.get('event_category') || undefined,
        severity: searchParams.get('severity') || undefined,
        user_id: searchParams.get('user_id') || undefined,
        organization_id: searchParams.get('organization_id') || undefined,
        is_resolved: searchParams.get('is_resolved') === 'true' || undefined,
        min_risk_score: searchParams.get('min_risk_score')
          ? parseInt(searchParams.get('min_risk_score')!)
          : undefined,
        start_date: searchParams.get('start_date') || undefined,
        end_date: searchParams.get('end_date') || undefined,
        limit: parseInt(searchParams.get('limit') || '100'),
        offset: parseInt(searchParams.get('offset') || '0'),
      };

      // Validate query parameters
      const validation = securityEventsQuerySchema.safeParse(queryParams);
      if (!validation.success) {
        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          'Invalid query parameters',
          validation.error.errors
        );
      }

      const filters = validation.data;

      // Build query conditions
      const conditions = [];

      if (filters.event_type) {
        conditions.push(eq(securityEvents.eventType, filters.event_type));
      }

      if (filters.event_category) {
        conditions.push(eq(securityEvents.eventCategory, filters.event_category));
      }

      if (filters.severity) {
        conditions.push(eq(securityEvents.severity, filters.severity));
      }

      if (filters.user_id) {
        conditions.push(eq(securityEvents.userId, filters.user_id));
      }

      if (filters.organization_id) {
        conditions.push(eq(securityEvents.organizationId, filters.organization_id));
      }

      if (filters.is_resolved !== undefined) {
        conditions.push(eq(securityEvents.isResolved, filters.is_resolved));
      }

      if (filters.min_risk_score !== undefined) {
        conditions.push(gte(securityEvents.riskScore, filters.min_risk_score));
      }

      if (filters.start_date) {
        conditions.push(gte(securityEvents.createdAt, new Date(filters.start_date)));
      }

      if (filters.end_date) {
        conditions.push(lte(securityEvents.createdAt, new Date(filters.end_date)));
      }

      // Fetch security events
      const events = await db
        .select()
        .from(securityEvents)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(securityEvents.createdAt))
        .limit(filters.limit)
        .offset(filters.offset);

      // Calculate statistics
      const criticalCount = events.filter((e) => e.severity === 'critical').length;
      const unresolvedCount = events.filter((e) => !e.isResolved).length;
      const avgRiskScore =
        events.reduce((sum, e) => sum + (e.riskScore || 0), 0) / events.length || 0;

      // Audit log
      await logApiAuditEvent({
        action: 'security.events.read',
        userId,
        resourceType: 'security_event',
        severity: 'info',
        metadata: { filters, count: events.length },
      });

      logger.info('Security events retrieved', {
        userId,
        count: events.length,
        filters,
      });

      return standardSuccessResponse({
        events,
        statistics: {
          total: events.length,
          critical: criticalCount,
          unresolved: unresolvedCount,
          averageRiskScore: Math.round(avgRiskScore),
        },
        pagination: {
          limit: filters.limit,
          offset: filters.offset,
          count: events.length,
          hasMore: events.length === filters.limit,
        },
        filters,
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error retrieving security events', { error, userId });
      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        'Failed to retrieve security events'
      );
    }
  })(request, {});
};
