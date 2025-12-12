import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { members, billingTemplates } from '@/services/financial-service/src/db/schema';
import { eq, and, desc } from 'drizzle-orm';

// List all billing templates
export async function GET(req: NextRequest) {
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

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');

    // Build query
    let whereConditions = [eq(billingTemplates.tenantId, member.tenantId)];
    if (category) {
      whereConditions.push(eq(billingTemplates.category, category));
    }

    const templates = await db
      .select()
      .from(billingTemplates)
      .where(and(...whereConditions))
      .orderBy(desc(billingTemplates.createdAt));

    return NextResponse.json({ templates });

  } catch (error) {
    console.error('List templates error:', error);
    return NextResponse.json(
      { error: 'Failed to list templates' },
      { status: 500 }
    );
  }
}

// Create a new billing template
export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const { name, description, category, templateHtml, templateText, subject, isDefault } = body;

    // Validate required fields
    if (!name || !category || !templateHtml) {
      return NextResponse.json(
        { error: 'name, category, and templateHtml are required' },
        { status: 400 }
      );
    }

    // Validate category
    const validCategories = ['invoice', 'reminder', 'statement', 'notice', 'letter', 'receipt'];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${validCategories.join(', ')}` },
        { status: 400 }
      );
    }

    // Extract variables from template HTML (look for {variable_name} patterns)
    const variableMatches = templateHtml.match(/\{([a-z_]+)\}/gi) || [];
    const variables = Array.from(new Set(variableMatches.map((m: string) => m.replace(/[{}]/g, ''))));

    // If isDefault is true, unset other defaults in same category
    if (isDefault) {
      await db
        .update(billingTemplates)
        .set({ isDefault: false })
        .where(
          and(
            eq(billingTemplates.tenantId, member.tenantId),
            eq(billingTemplates.category, category),
            eq(billingTemplates.isDefault, true)
          )
        );
    }

    // Create template
    const [template] = await db
      .insert(billingTemplates)
      .values({
        tenantId: member.tenantId,
        name,
        description: description || null,
        category,
        templateHtml,
        templateText: templateText || templateHtml.replace(/<[^>]*>/g, ''), // Strip HTML tags for text version
        subject: subject || `${category.charAt(0).toUpperCase() + category.slice(1)} - {union_name}`,
        variables: JSON.stringify(variables),
        isDefault: isDefault || false,
        isActive: true,
        createdBy: member.id,
      })
      .returning();

    return NextResponse.json({
      message: 'Template created successfully',
      template,
      variables,
    });

  } catch (error) {
    console.error('Create template error:', error);
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    );
  }
}
