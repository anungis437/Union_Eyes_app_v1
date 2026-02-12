/**
 * API Keys Management API Route
 * 
 * Handles API key listing and creation for integrations.
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
import { db } from '@/db';
import { integrationApiKeys } from '@/db/schema';
import { eq, and, gt, or, isNull } from 'drizzle-orm';
import { z } from 'zod';
import crypto from 'crypto';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  organization_id: z.string().uuid().optional(),
  scopes: z.array(z.string()).min(1),
  expires_at: z.string().datetime().optional(),
});

// ============================================================================
// GET /api/integrations/api-keys
// List API keys
// ============================================================================

export const GET = async (request: NextRequest) => {
  return withEnhancedRoleAuth(290, async (request, context) => {
    const { userId } = context;

    try {
      // Rate limiting
      const rateLimitResult = await checkRateLimit(userId, {
        limit: 50,
        window: 60,
        identifier: 'api-keys-read',
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
      const includeExpired = searchParams.get('include_expired') === 'true';

      // Query API keys from database
      const whereConditions = [];
      if (organizationId) {
        whereConditions.push(eq(integrationApiKeys.organizationId, organizationId));
      }
      if (!includeExpired) {
        whereConditions.push(
          or(
            isNull(integrationApiKeys.expiresAt),
            gt(integrationApiKeys.expiresAt, new Date())
          )
        );
      }

      const apiKeys = await db.query.integrationApiKeys.findMany({
        where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
        columns: {
          id: true,
          name: true,
          description: true,
          keyPrefix: true,
          scopes: true,
          isActive: true,
          expiresAt: true,
          lastUsedAt: true,
          usageCount: true,
          createdAt: true,
          createdBy: true,
        },
      });

      // Audit log
      await logApiAuditEvent({
        action: 'integrations.api_keys.list',
        userId,
        resourceType: 'api_key',
        severity: 'info',
        metadata: { organizationId, count: apiKeys.length },
      });

      logger.info('API keys listed', { userId, count: apiKeys.length });

      return standardSuccessResponse({
        apiKeys,
        count: apiKeys.length,
      });
    } catch (error) {
      logger.error('Error listing API keys', { error, userId });
      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        'Failed to list API keys'
      );
    }
  })(request, {});
};

// ============================================================================
// POST /api/integrations/api-keys
// Create API key
// ============================================================================

export const POST = async (request: NextRequest) => {
  return withEnhancedRoleAuth(290, async (request, context) => {
    const { userId } = context;

    try {
      // Rate limiting
      const rateLimitResult = await checkRateLimit(userId, {
        limit: 10,
        window: 60,
        identifier: 'api-keys-create',
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
      const validation = createApiKeySchema.safeParse(body);
      if (!validation.success) {
        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          'Invalid API key data',
          validation.error.errors
        );
      }

      const keyData = validation.data;

      // Generate API key
      const apiKey = `sk_${crypto.randomBytes(32).toString('hex')}`;
      const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
      const keyPrefix = apiKey.substring(0, 10);

      // Store API key in database
      const [storedKey] = await db
        .insert(integrationApiKeys)
        .values({
          name: keyData.name,
          description: keyData.description,
          keyHash,
          keyPrefix,
          scopes: keyData.scopes,
          organizationId: keyData.organization_id,
          expiresAt: keyData.expires_at ? new Date(keyData.expires_at) : null,
          createdBy: userId,
        })
        .returning();

      // Audit log
      await logApiAuditEvent({
        action: 'integrations.api_key.created',
        userId,
        resourceType: 'api_key',
        resourceId: storedKey.id,
        severity: 'info',
        metadata: { name: keyData.name, scopes: keyData.scopes },
      });

      logger.info('API key created', { userId, keyId: storedKey.id });

      return standardSuccessResponse(
        {
          apiKey: {
            ...storedKey,
            key: apiKey, // Only show once
          },
          warning: 'Store this key securely. It will not be shown again.',
        },
        { status: 201 }
      );
    } catch (error) {
      logger.error('Error creating API key', { error, userId });
      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        'Failed to create API key'
      );
    }
  })(request, {});
};
