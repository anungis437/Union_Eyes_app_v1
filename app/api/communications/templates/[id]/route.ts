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
import { getCurrentUser } from '@/lib/auth';

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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!user.tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }

    const [template] = await db
      .select()
      .from(newsletterTemplates)
      .where(
        and(
          eq(newsletterTemplates.id, params.id),
          eq(newsletterTemplates.organizationId, user.tenantId)
        )
      );

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error('Error fetching template:', error);
    return NextResponse.json(
      { error: 'Failed to fetch template' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!user.tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateTemplateSchema.parse(body);

    // Check if template exists and is not a system template
    const [existing] = await db
      .select()
      .from(newsletterTemplates)
      .where(
        and(
          eq(newsletterTemplates.id, params.id),
          eq(newsletterTemplates.organizationId, user.tenantId)
        )
      );

    if (!existing) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
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
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating template:', error);
    return NextResponse.json(
      { error: 'Failed to update template' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!user.tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }

    // Check if template exists and is not a system template
    const [existing] = await db
      .select()
      .from(newsletterTemplates)
      .where(
        and(
          eq(newsletterTemplates.id, params.id),
          eq(newsletterTemplates.organizationId, user.tenantId)
        )
      );

    if (!existing) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
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
    console.error('Error deleting template:', error);
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    );
  }
}
