/**
 * Billing Subscription Detail API Route
 * 
 * Handles individual subscription operations (get, update).
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

const updateSubscriptionSchema = z.object({
  price_id: z.string().optional(),
  cancel_at_period_end: z.boolean().optional(),
  quantity: z.number().int().positive().optional(),
});

// ============================================================================
// GET /api/billing/subscriptions/[id]
// Get subscription details
// ============================================================================

export const GET = async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  return withEnhancedRoleAuth(280, async (request, context) => {
    const { userId } = context;

    try {
      const subscriptionId = params.id;

      // Rate limiting
      const rateLimitResult = await checkRateLimit(userId, {
        limit: 100,
        window: 60,
        identifier: 'billing-subscription-read',
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

      // TODO: Integrate with billingService
      // const subscription = await billingService.getSubscription(subscriptionId);

      const subscription = null; // Placeholder

      if (!subscription) {
        return standardErrorResponse(
          ErrorCode.NOT_FOUND,
          'Subscription not found'
        );
      }

      // Audit log
      await logApiAuditEvent({
        action: 'billing.subscription.read',
        userId,
        resourceType: 'subscription',
        resourceId: subscriptionId,
        severity: 'info',
      });

      logger.info('Billing subscription retrieved', { userId, subscriptionId });

      return standardSuccessResponse({ subscription });
    } catch (error) {
      logger.error('Error retrieving billing subscription', { error, userId });
      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        'Failed to retrieve billing subscription'
      );
    }
  })(request, {});
};

// ============================================================================
// PATCH /api/billing/subscriptions/[id]
// Update subscription
// ============================================================================

export const PATCH = async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  return withEnhancedRoleAuth(280, async (request, context) => {
    const { userId } = context;

    try {
      const subscriptionId = params.id;

      // Rate limiting
      const rateLimitResult = await checkRateLimit(userId, {
        limit: 30,
        window: 60,
        identifier: 'billing-subscription-update',
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

      const body = await request.json();

      // Validate request body
      const validation = updateSubscriptionSchema.safeParse(body);
      if (!validation.success) {
        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          'Invalid update data',
          validation.error.errors
        );
      }

      const updates = validation.data;

      // TODO: Integrate with billingService
      // const updatedSubscription = await billingService.updateSubscription(
      //   subscriptionId,
      //   updates
      // );

      const updatedSubscription = null; // Placeholder

      // Audit log
      await logApiAuditEvent({
        action: 'billing.subscription.updated',
        userId,
        resourceType: 'subscription',
        resourceId: subscriptionId,
        newValues: updates,
        severity: 'info',
        metadata: { changes: Object.keys(updates) },
      });

      logger.info('Billing subscription updated', {
        userId,
        subscriptionId,
        changes: Object.keys(updates),
      });

      return standardSuccessResponse({ subscription: updatedSubscription });
    } catch (error) {
      logger.error('Error updating billing subscription', { error, userId });
      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        'Failed to update billing subscription'
      );
    }
  })(request, {});
};
