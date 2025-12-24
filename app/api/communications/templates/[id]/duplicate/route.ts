/**
 * Newsletter Template Duplication API
 * 
 * Endpoint:
 * - POST /api/communications/templates/[id]/duplicate - Duplicate template
 * 
 * Version: 1.0.0
 * Created: December 6, 2025
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { newsletterTemplates } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function POST(
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

    // Fetch original template
    const [original] = await db
      .select()
      .from(newsletterTemplates)
      .where(
        and(
          eq(newsletterTemplates.id, params.id),
          eq(newsletterTemplates.organizationId, user.tenantId)
        )
      );

    if (!original) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Create duplicate - note: subject/preheader are campaign-level fields, not template-level
    const [duplicate] = await db
      .insert(newsletterTemplates)
      .values({
        organizationId: user.tenantId,
        createdBy: user.id,
        name: `${original.name} (Copy)`,
        description: original.description,
        category: original.category,
        htmlContent: original.htmlContent,
        jsonStructure: original.jsonStructure,
        variables: original.variables,
        thumbnailUrl: original.thumbnailUrl,
        isSystem: false, // Duplicates are never system templates
      })
      .returning();

    return NextResponse.json({ template: duplicate }, { status: 201 });
  } catch (error) {
    console.error('Error duplicating template:', error);
    return NextResponse.json(
      { error: 'Failed to duplicate template' },
      { status: 500 }
    );
  }
}
