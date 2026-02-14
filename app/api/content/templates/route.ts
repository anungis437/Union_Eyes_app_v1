/**
 * Content Templates API Route
 * 
 * Handles content template management for content manager.
 * Part of Phase 4 - App Operations Roles implementation.
 * 
 * Authentication: Minimum role level 320 (content_manager)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';
import { checkRateLimit, createRateLimitHeaders } from '@/lib/rate-limiter';
import { logApiAuditEvent } from '@/lib/middleware/api-security';
import { 
  standardSuccessResponse, 
  standardErrorResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import crypto from 'crypto';
import { db } from '@/db';
import { cmsTemplates } from '@/db/schema/domains/infrastructure/cms';
import { eq, and, ilike, desc } from 'drizzle-orm';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  category: z.enum(['email', 'document', 'notification', 'report', 'other']),
  content: z.string().min(1),
  variables: z.array(z.string()).optional(),
  is_active: z.boolean().default(true),
  organization_id: z.string().uuid().optional(),
  metadata: z.record(z.any()).optional(),
});

const listTemplatesSchema = z.object({
  category: z.enum(['email', 'document', 'notification', 'report', 'other']).optional(),
  is_active: z.boolean().optional(),
  organization_id: z.string().uuid().optional(),
  search: z.string().optional(),
  limit: z.number().int().min(1).max(200).default(50),
  offset: z.number().int().min(0).default(0),
});

// ============================================================================
// GET /api/content/templates
// List templates
// ============================================================================

export const GET = async (request: NextRequest) => {
  return withEnhancedRoleAuth(320, async (request, context) => {
    const { userId } = context;

    try {
      // Rate limiting
      const rateLimitResult = await checkRateLimit(userId, {
        limit: 100,
        window: 60,
        identifier: 'content-templates-read',
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
        category: searchParams.get('category') || undefined,
        is_active: searchParams.get('is_active') === 'true' || undefined,
        organization_id: searchParams.get('organization_id') || undefined,
        search: searchParams.get('search') || undefined,
        limit: parseInt(searchParams.get('limit') || '50'),
        offset: parseInt(searchParams.get('offset') || '0'),
      };

      // Validate query parameters
      const validation = listTemplatesSchema.safeParse(queryParams);
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
      if (filters.organization_id) {
        conditions.push(eq(cmsTemplates.organizationId, filters.organization_id));
      }
      if (filters.category) {
        // Map request categories to template types
        const categoryMap: Record<string, string> = {
          'email': 'page',
          'document': 'post',
          'notification': 'event',
          'report': 'landing',
          'other': 'custom',
        };
        conditions.push(eq(cmsTemplates.templateType, categoryMap[filters.category] || filters.category));
      }
      if (typeof filters.is_active === 'boolean') {
        conditions.push(eq(cmsTemplates.isPublished, filters.is_active));
      }
      if (filters.search) {
        conditions.push(ilike(cmsTemplates.name, `%${filters.search}%`));
      }

      // Query templates from database
      const query = db
        .select()
        .from(cmsTemplates)
        .orderBy(desc(cmsTemplates.createdAt))
        .limit(filters.limit)
        .offset(filters.offset);

      const templates = conditions.length > 0
        ? await query.where(and(...conditions))
        : await query;

      // Audit log
      await logApiAuditEvent({
        action: 'content.templates.list',
        userId,
        resourceType: 'content_template',
        severity: 'info',
        metadata: { filters, count: templates.length },
      });

      logger.info('Content templates listed', {
        userId,
        count: templates.length,
        filters,
      });

      return standardSuccessResponse({
        templates,
        pagination: {
          limit: filters.limit,
          offset: filters.offset,
          count: templates.length,
          hasMore: false,
        },
        filters,
      });
    } catch (error) {
      logger.error('Error listing content templates', { error, userId });
      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        'Failed to list content templates'
      );
    }
  })(request, {});
};

// ============================================================================
// POST /api/content/templates
// Create template
// ============================================================================

export const POST = async (request: NextRequest) => {
  return withEnhancedRoleAuth(320, async (request, context) => {
    const { userId } = context;

    try {
      // Rate limiting
      const rateLimitResult = await checkRateLimit(userId, {
        limit: 30,
        window: 60,
        identifier: 'content-templates-create',
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
      const validation = createTemplateSchema.safeParse(body);
      if (!validation.success) {
        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          'Invalid template data',
          validation.error.errors
        );
      }

      const templateData = validation.data;

      // Map request category to template type
      const categoryMap: Record<string, string> = {
        'email': 'page',
        'document': 'post',
        'notification': 'event',
        'report': 'landing',
        'other': 'custom',
      };

      // Store template in database
      const [template] = await db
        .insert(cmsTemplates)
        .values({
          organizationId: templateData.organization_id || crypto.randomUUID(), // Default org if not provided
          name: templateData.name,
          description: templateData.description || null,
          templateType: categoryMap[templateData.category] || 'custom',
          category: templateData.category,
          layoutConfig: {
            content: templateData.content,
            variables: templateData.variables || [],
            metadata: templateData.metadata || {},
          },
          isSystem: false,
          isPublished: templateData.is_active,
          createdBy: userId,
        })
        .returning();

      // Audit log
      await logApiAuditEvent({
        action: 'content.template.created',
        userId,
        resourceType: 'content_template',
        resourceId: template.id,
        severity: 'info',
        metadata: { name: templateData.name, category: templateData.category },
      });

      logger.info('Content template created', {
        userId,
        templateId: template.id,
        name: templateData.name,
      });

      return standardSuccessResponse(
        { template },
        { status: 201 }
      );
    } catch (error) {
      logger.error('Error creating content template', { error, userId });
      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        'Failed to create content template'
      );
    }
  })(request, {});
};
