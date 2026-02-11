/**
 * Newsletter Template Detail API
 * 
 * Endpoints:
 * - GET /api/communications/templates/[id] - Get template by ID
 * - PUT /api/communications/templates/[id] - Update template
 * - DELETE /api/communications/templates/[id] - Delete template
 * 
 * Version: 1.0.0
 * Created: December 6, 2025
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { newsletterTemplates } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { withOrganizationAuth } from '@/lib/organization-middleware';

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
const updateTemplateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  category: z.enum(['general', 'announcement', 'event', 'update', 'custom']).optional(),
  // Note: subject and preheader are campaign-level fields, not template-level
  htmlContent: z.string().min(1).optional(),
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
});

export const GET = withOrganizationAuth(async (
  request: NextRequest,
  context,
  params?: { id: string }
) => {
  try {
    const { organizationId } = context;

    if (!params?.id) {
      return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Template ID required'
    );
    }

    const [template] = await db
      .select()
      .from(newsletterTemplates)
      .where(
        and(
          eq(newsletterTemplates.id, params.id),
          eq(newsletterTemplates.organizationId, organizationId)
        )
      );

    if (!template) {
      return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Template not found'
    );
    }

    return NextResponse.json({ template });
  } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch template',
      error
    );
  }
});

export const PUT = withOrganizationAuth(async (
  request: NextRequest,
  context,
  params?: { id: string }
) => {
  try {
    const { organizationId } = context;

    if (!params?.id) {
      return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Template ID required'
    );
    }

    const body = await request.json();
    const validation = updateTemplateSchema.safeParse(body);
    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        validation.error.errors[0]?.message || 'Invalid request data'
      );
    }
    const validatedData = validation.data;

    // Check if template exists and is not a system template
    const [existing] = await db
      .select()
      .from(newsletterTemplates)
      .where(
        and(
          eq(newsletterTemplates.id, params.id),
          eq(newsletterTemplates.organizationId, organizationId)
        )
      );

    if (!existing) {
      return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Template not found'
    );
    }

    if (existing.isSystem) {
      return NextResponse.json(
        { error: 'Cannot modify system templates' },
        { status: 403 }
      );
    }

    const [template] = await db
      .update(newsletterTemplates)
      .set(validatedData)
      .where(eq(newsletterTemplates.id, params.id))
      .returning();

    return NextResponse.json({ template });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Validation error',
      error
    );
    }

    // Check if template exists and is not a system template
    const [existing] = await db
      .select()
      .from(newsletterTemplates)
      .where(
        and(
          eq(newsletterTemplates.id, params.id),
          eq(newsletterTemplates.organizationId, organizationId)
        )
      );

    if (!existing) {
      return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Template not found',
      error
    );
    }

    if (existing.isSystem) {
      return NextResponse.json(
        { error: 'Cannot delete system templates' },
        { status: 403 }
      );
    }

    await db
      .delete(newsletterTemplates)
      .where(eq(newsletterTemplates.id, params.id));

    return NextResponse.json({ success: true });
  } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to delete template',
      error
    );
  }
});
