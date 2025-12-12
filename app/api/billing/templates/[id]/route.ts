import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { members, billingTemplates } from '@/services/financial-service/src/db/schema';
import { eq, and } from 'drizzle-orm';

// Update a billing template
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get member to verify tenant
    const [member] = await db
      .select()
      .from(members)
      .where(eq(members.userId, userId))
      .limit(1);

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Get existing template
    const [existingTemplate] = await db
      .select()
      .from(billingTemplates)
      .where(
        and(
          eq(billingTemplates.id, params.id),
          eq(billingTemplates.tenantId, member.tenantId)
        )
      )
      .limit(1);

    if (!existingTemplate) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const body = await req.json();
    const { name, description, templateHtml, templateText, subject, isDefault, isActive } = body;

    // Extract variables from template HTML if provided
    let variables = existingTemplate.variables;
    if (templateHtml) {
      const variableMatches = templateHtml.match(/\{([a-z_]+)\}/gi) || [];
      const uniqueVars = Array.from(new Set(variableMatches.map((m: string) => m.replace(/[{}]/g, ''))));
      variables = JSON.stringify(uniqueVars);
    }

    // If isDefault is being set to true, unset other defaults
    if (isDefault && !existingTemplate.isDefault) {
      await db
        .update(billingTemplates)
        .set({ isDefault: false })
        .where(
          and(
            eq(billingTemplates.tenantId, member.tenantId),
            eq(billingTemplates.category, existingTemplate.category),
            eq(billingTemplates.isDefault, true)
          )
        );
    }

    // Update template
    const [updatedTemplate] = await db
      .update(billingTemplates)
      .set({
        name: name || existingTemplate.name,
        description: description !== undefined ? description : existingTemplate.description,
        templateHtml: templateHtml || existingTemplate.templateHtml,
        templateText: templateText || (templateHtml ? templateHtml.replace(/<[^>]*>/g, '') : existingTemplate.templateText),
        subject: subject !== undefined ? subject : existingTemplate.subject,
        variables,
        isDefault: isDefault !== undefined ? isDefault : existingTemplate.isDefault,
        isActive: isActive !== undefined ? isActive : existingTemplate.isActive,
        updatedBy: member.id,
        updatedAt: new Date(),
      })
      .where(eq(billingTemplates.id, params.id))
      .returning();

    return NextResponse.json({
      message: 'Template updated successfully',
      template: updatedTemplate,
    });

  } catch (error) {
    console.error('Update template error:', error);
    return NextResponse.json(
      { error: 'Failed to update template' },
      { status: 500 }
    );
  }
}

// Delete a billing template
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get member to verify tenant
    const [member] = await db
      .select()
      .from(members)
      .where(eq(members.userId, userId))
      .limit(1);

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Get template
    const [template] = await db
      .select()
      .from(billingTemplates)
      .where(
        and(
          eq(billingTemplates.id, params.id),
          eq(billingTemplates.tenantId, member.tenantId)
        )
      )
      .limit(1);

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Prevent deletion of default templates
    if (template.isDefault) {
      return NextResponse.json(
        { error: 'Cannot delete default template. Set another template as default first.' },
        { status: 400 }
      );
    }

    // Delete template
    await db
      .delete(billingTemplates)
      .where(eq(billingTemplates.id, params.id));

    return NextResponse.json({
      message: 'Template deleted successfully',
    });

  } catch (error) {
    console.error('Delete template error:', error);
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    );
  }
}
