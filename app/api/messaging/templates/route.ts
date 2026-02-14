/**
 * Message Templates API Routes
 * 
 * POST /api/messaging/templates - Create template
 * GET  /api/messaging/templates - List templates
 * 
 * Phase 4: Communications & Organizing
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { messageTemplates } from '@/db/schema';
import { desc, and } from 'drizzle-orm';
import { withRLSContext } from '@/lib/db/rls-context';
import { auth } from '@clerk/nextjs/server';
import { logger } from '@/lib/logger';

/**
 * GET /api/messaging/templates
 * List templates with pagination and filters
 */
export async function GET(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const type = searchParams.get('type');
    const category = searchParams.get('category');
    const isActive = searchParams.get('isActive');

    const offset = (page - 1) * pageSize;

    const result = await withRLSContext(async () => {
      // Build where conditions
      const whereConditions = [eq(messageTemplates.organizationId, orgId)];

      if (type) {
        whereConditions.push(eq(messageTemplates.type, type));
      }

      if (category) {
        whereConditions.push(eq(messageTemplates.category, category));
      }

      if (isActive !== null && isActive !== undefined) {
        whereConditions.push(eq(messageTemplates.isActive, isActive === 'true'));
      }

      // Get templates
      const templatesList = await db
        .select()
        .from(messageTemplates)
        .where(and(...whereConditions))
        .orderBy(desc(messageTemplates.createdAt))
        .limit(pageSize)
        .offset(offset);

      // Get total count
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(messageTemplates)
        .where(and(...whereConditions));

      return {
        templates: templatesList,
        pagination: {
          page,
          pageSize,
          total: count,
          totalPages: Math.ceil(count / pageSize),
        },
      };
    }, { organizationId: orgId, userId });

    return NextResponse.json(result);
  } catch (error) {
    logger.error('Error fetching templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/messaging/templates
 * Create new template
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.type || !body.body) {
      return NextResponse.json(
        { error: 'Missing required fields: name, type, body' },
        { status: 400 }
      );
    }

    const template = await withRLSContext(async () => {
      const [newTemplate] = await db
        .insert(messageTemplates)
        .values({
          organizationId: orgId,
          name: body.name,
          description: body.description || null,
          type: body.type,
          category: body.category || null,
          subject: body.subject || null,
          body: body.body,
          preheader: body.preheader || null,
          variables: body.variables || [],
          htmlContent: body.htmlContent || null,
          plainTextContent: body.plainTextContent || null,
          metadata: body.metadata || {},
          tags: body.tags || [],
          isActive: body.isActive !== undefined ? body.isActive : true,
          isDefault: body.isDefault || false,
          createdBy: userId,
        })
        .returning();

      return newTemplate;
    }, { organizationId: orgId, userId });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    logger.error('Error creating template:', error);
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    );
  }
}
