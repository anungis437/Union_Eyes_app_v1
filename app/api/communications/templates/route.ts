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
// TODO: Migrate to withApiAuth wrapper pattern for consistency
// Original pattern used getCurrentUser() with manual auth checks


import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { newsletterTemplates } from '@/db/schema';
import { eq, and, or, like, desc } from 'drizzle-orm';
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';

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

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { tenantId } = user;

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    let query = db
      .select()
      .from(newsletterTemplates)
      .where(eq(newsletterTemplates.organizationId, tenantId))
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

    return NextResponse.json({ templates });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id: userId, tenantId } = user;

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createTemplateSchema.parse(body);

    const [template] = await db
      .insert(newsletterTemplates)
      .values({
        organizationId: tenantId,
        createdBy: userId,
        ...validatedData,
      })
      .returning();

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating template:', error);
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    );
  }
}

