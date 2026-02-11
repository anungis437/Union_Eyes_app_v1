/**
 * Newsletter Templates API
 * 
 * Endpoints:
 * - GET /api/communications/templates - List all templates
 * - POST /api/communications/templates - Create new template
 * 
 * Version: 1.0.0
 * Created: December 6, 2025
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { newsletterTemplates } from '@/db/schema';
import { eq, and, or, like, desc } from 'drizzle-orm';
import { withOrganizationAuth } from '@/lib/organization-middleware';
import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';

const createTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  description: z.string().optional(),
  category: z.enum(['general', 'announcement', 'event', 'update', 'custom']),
  // Note: subject and preheader are campaign-level fields, not template-level
  htmlContent: z.string().min(1, 'Content is required'),
  jsonStructure: z.any().optional(),
  variables: z.array(z.object({
    name: z.string(),
    label: z.string(),
    type: z.enum(['text', 'number', 'date', 'boolean', 'image', 'url']),
    default: z.any().optional(),
    required: z.boolean().optional(),
    description: z.string().optional(),
  })).optional(),
  thumbnailUrl: z.string().optional(),
  isSystem: z.boolean().optional(),
});

export const GET = withOrganizationAuth(async (request: NextRequest, context) => {
  try {
    const { organizationId, userId } = context;

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    let query = db
      .select()
      .from(newsletterTemplates)
      .where(eq(newsletterTemplates.organizationId, organizationId))
      .$dynamic();

    if (category && category !== 'all') {
      query = query.where(eq(newsletterTemplates.category, category as any));
    }

    if (search) {
      query = query.where(
        or(
          like(newsletterTemplates.name, `%${search}%`),
          like(newsletterTemplates.description, `%${search}%`)
        )
      );
    }

    const templates = await query.orderBy(desc(newsletterTemplates.createdAt));

    return standardSuccessResponse({ templates });
  } catch (error) {
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch templates',
      error
    );
  }
});

export const POST = withOrganizationAuth(async (request: NextRequest, context) => {
  try {
    const { organizationId, userId } = context;

    const body = await request.json();
    const validation = createTemplateSchema.safeParse(body);
    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        validation.error.errors[0]?.message || 'Invalid template data'
      );
    }

    const validatedData = validation.data;

    const [template] = await db
      .insert(newsletterTemplates)
      .values({
        organizationId,
        createdBy: userId,
        ...validatedData,
      })
      .returning();

    return standardSuccessResponse(
      { template },
      'Template created successfully',
      201
    );
  } catch (error) {
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to create template',
      error
    );
  }
});

