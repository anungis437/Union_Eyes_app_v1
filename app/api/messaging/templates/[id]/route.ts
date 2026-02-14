/**
 * Template Detail API Routes
 * 
 * GET    /api/messaging/templates/[id] - Get template
 * PUT    /api/messaging/templates/[id] - Update template
 * DELETE /api/messaging/templates/[id] - Delete template
 * 
 * Phase 4: Communications & Organizing
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { messageTemplates, campaigns } from '@/db/schema';
import { and } from 'drizzle-orm';
import { withRLSContext } from '@/lib/db/rls-context';
import { auth } from '@clerk/nextjs/server';
import { logger } from '@/lib/logger';

/**
 * GET /api/messaging/templates/[id]
 * Get template details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, orgId } = await auth();
    const { id } = await params;

    if (!userId || !orgId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const template = await withRLSContext(async () => {
      const [result] = await db
        .select()
        .from(messageTemplates)
        .where(
          and(
            eq(messageTemplates.id, id),
            eq(messageTemplates.organizationId, orgId)
          )
        )
        .limit(1);

      return result;
    }, { organizationId: orgId, userId });

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(template);
  } catch (error) {
    logger.error('Error fetching template:', error);
    return NextResponse.json(
      { error: 'Failed to fetch template' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/messaging/templates/[id]
 * Update template
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, orgId } = await auth();
    const { id } = await params;

    if (!userId || !orgId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();

    const template = await withRLSContext(async () => {
      // Check template exists and belongs to org
      const [existing] = await db
        .select()
        .from(messageTemplates)
        .where(
          and(
            eq(messageTemplates.id, id),
            eq(messageTemplates.organizationId, orgId)
          )
        )
        .limit(1);

      if (!existing) {
        throw new Error('Template not found');
      }

      // Update template
      const [updated] = await db
        .update(messageTemplates)
        .set({
          name: body.name || existing.name,
          description: body.description !== undefined ? body.description : existing.description,
          category: body.category !== undefined ? body.category : existing.category,
          subject: body.subject !== undefined ? body.subject : existing.subject,
          body: body.body || existing.body,
          preheader: body.preheader !== undefined ? body.preheader : existing.preheader,
          variables: body.variables || existing.variables,
          htmlContent: body.htmlContent !== undefined ? body.htmlContent : existing.htmlContent,
          plainTextContent: body.plainTextContent !== undefined ? body.plainTextContent : existing.plainTextContent,
          metadata: body.metadata || existing.metadata,
          tags: body.tags || existing.tags,
          isActive: body.isActive !== undefined ? body.isActive : existing.isActive,
          isDefault: body.isDefault !== undefined ? body.isDefault : existing.isDefault,
          updatedBy: userId,
          updatedAt: new Date(),
        })
        .where(eq(messageTemplates.id, id))
        .returning();

      return updated;
    }, { organizationId: orgId, userId });

    return NextResponse.json(template);
  } catch (error) {
    logger.error('Error updating template:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update template' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/messaging/templates/[id]
 * Delete template (only if not used by campaigns)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, orgId } = await auth();
    const { id } = await params;

    if (!userId || !orgId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await withRLSContext(async () => {
      // Check template exists
      const [existing] = await db
        .select()
        .from(messageTemplates)
        .where(
          and(
            eq(messageTemplates.id, id),
            eq(messageTemplates.organizationId, orgId)
          )
        )
        .limit(1);

      if (!existing) {
        throw new Error('Template not found');
      }

      // Check if template is used by any campaigns
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(campaigns)
        .where(
          and(
            eq(campaigns.templateId, id),
            eq(campaigns.organizationId, orgId)
          )
        );

      if (count > 0) {
        throw new Error(`Template is used by ${count} campaign(s). Cannot delete.`);
      }

      // Delete template
      await db
        .delete(messageTemplates)
        .where(eq(messageTemplates.id, id));
    }, { organizationId: orgId, userId });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error deleting template:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete template' },
      { status: 500 }
    );
  }
}
