/**
 * Webhooks Management API Route
 * 
 * Handles webhook listing and creation for integrations.
 * Part of Phase 3 - App Operations Roles implementation.
 * 
 * Authentication: Minimum role level 290 (integration_manager)
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
import { z } from 'zod';
import crypto from 'crypto';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createWebhookSchema = z.object({
  url: z.string().url(),
  description: z.string().max(500).optional(),
  organization_id: z.string().uuid().optional(),
  events: z.array(z.string()).min(1),
  is_active: z.boolean().default(true),
  secret: z.string().optional(),
});

// ============================================================================
// GET /api/integrations/webhooks
// List webhooks
// ============================================================================

export const GET = async (request: NextRequest) => {
  return withEnhancedRoleAuth(290, async (request, context) => {
    const { userId } = context;

    try {
      // Rate limiting
      const rateLimitResult = await checkRateLimit(userId, {
        limit: 50,
        window: 60,
        identifier: 'webhooks-read',
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
      const organizationId = searchParams.get('organization_id');
      const isActive = searchParams.get('is_active');

      // TODO: Implement actual webhook storage and retrieval
      // For now, return empty array as placeholder
      const webhooks = [];

      // Audit log
      await logApiAuditEvent({
        action: 'integrations.webhooks.list',
        userId,
        resourceType: 'webhook',
        severity: 'info',
        metadata: { organizationId, count: webhooks.length },
      });

      logger.info('Webhooks listed', { userId, count: webhooks.length });

      return standardSuccessResponse({
        webhooks,
        count: webhooks.length,
      });
    } catch (error) {
      logger.error('Error listing webhooks', { error, userId });
      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        'Failed to list webhooks'
      );
    }
  })(request, {});
};

// ============================================================================
// POST /api/integrations/webhooks
// Create webhook
// ============================================================================

export const POST = async (request: NextRequest) => {
  return withEnhancedRoleAuth(290, async (request, context) => {
    const { userId } = context;

    try {
      // Rate limiting
      const rateLimitResult = await checkRateLimit(userId, {
        limit: 20,
        window: 60,
        identifier: 'webhooks-create',
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
      const validation = createWebhookSchema.safeParse(body);
      if (!validation.success) {
        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          'Invalid webhook data',
          validation.error.errors
        );
      }

      const webhookData = validation.data;

      // Generate webhook secret if not provided
      const secret =
        webhookData.secret || `whsec_${crypto.randomBytes(32).toString('hex')}`;

      // TODO: Store webhook in database
      const webhook = {
        id: crypto.randomUUID(),
        url: webhookData.url,
        description: webhookData.description,
        events: webhookData.events,
        organizationId: webhookData.organization_id,
        isActive: webhookData.is_active,
        secret,
        createdBy: userId,
        createdAt: new Date().toISOString(),
        lastTriggeredAt: null,
        deliveryCount: 0,
        failureCount: 0,
      };

      // Audit log
      await logApiAuditEvent({
        action: 'integrations.webhook.created',
        userId,
        resourceType: 'webhook',
        resourceId: webhook.id,
        severity: 'info',
        metadata: { url: webhookData.url, events: webhookData.events },
      });

      logger.info('Webhook created', { userId, webhookId: webhook.id });

      return standardSuccessResponse(
        { webhook },
        { status: 201 }
      );
    } catch (error) {
      logger.error('Error creating webhook', { error, userId });
      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        'Failed to create webhook'
      );
    }
  })(request, {});
};
