/**
 * Billing Subscriptions API Route
 * 
 * Provides subscription management for billing admin dashboard.
 * Part of Phase 2 - App Operations Roles implementation.
 * 
 * Authentication: Minimum role level 280 (billing_admin)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';
import { checkRateLimit, createRateLimitHeaders } from '@/lib/rate-limiter';
import { logApiAuditEvent } from '@/lib/middleware/api-security';
import { standardSuccessResponse,
} from '@/lib/api/standardized-responses';
import { logger } from '@/lib/logger';
import { z } from 'zod';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const listSubscriptionsSchema = z.object({
  status: z.enum(['active', 'trialing', 'past_due', 'cancelled', 'incomplete', 'unpaid']).optional(),
  plan: z.enum(['free', 'starter', 'professional', 'enterprise']).optional(),
  organization_id: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(200).default(50),
  offset: z.number().int().min(0).default(0),
});

// ============================================================================
// GET /api/billing/subscriptions
// List all subscriptions (admin view)
// ============================================================================

export const GET = async (request: NextRequest) => {
  return withEnhancedRoleAuth(280, async (request, context) => {
    const { userId } = context;

    try {
      // Rate limiting
      const rateLimitResult = await checkRateLimit(userId, {
        limit: 50,
        window: 60,
        identifier: 'billing-subscriptions-read',
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
        status: searchParams.get('status') || undefined,
        plan: searchParams.get('plan') || undefined,
        organization_id: searchParams.get('organization_id') || undefined,
        limit: parseInt(searchParams.get('limit') || '50'),
        offset: parseInt(searchParams.get('offset') || '0'),
      };

      // Validate query parameters
      const validation = listSubscriptionsSchema.safeParse(queryParams);
      if (!validation.success) {
        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          'Invalid query parameters',
          validation.error.errors
        );
      }

      const { status, plan, organization_id, limit, offset } = validation.data;

      // TODO: Integrate with actual billingService when ready
      // For now, return mock data structure
      const subscriptions = [];
      const totalCount = 0;

      // Placeholder for billingService integration:
      // const { subscriptions, total } = await billingService.getSubscriptions({
      //   status,
      //   plan,
      //   organizationId: organization_id,
      //   limit,
      //   offset,
      // });

      // Audit log
      await logApiAuditEvent({
        action: 'billing.subscriptions.list',
        userId,
        resourceType: 'subscription',
        severity: 'info',
        metadata: { filters: { status, plan, organization_id } },
      });

      logger.info('Billing subscriptions listed', {
        userId,
        count: subscriptions.length,
        filters: { status, plan, organization_id },
      });

      return standardSuccessResponse({
        subscriptions,
        pagination: {
          limit,
          offset,
          total: totalCount,
          hasMore: offset + subscriptions.length < totalCount,
        },
        filters: { status, plan, organization_id },
      });
    } catch (error) {
      logger.error('Error listing billing subscriptions', { error, userId });
      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        'Failed to list billing subscriptions'
      );
    }
  })(request, {});
};
