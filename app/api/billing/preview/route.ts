import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { members, billingTemplates, duesTransactions } from '@/services/financial-service/src/db/schema';
import { eq, and } from 'drizzle-orm';

// Render a template with sample or real data
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
    const { templateId, data, useSampleData } = body;

    // Validate required fields
    if (!templateId) {
      return NextResponse.json(
        { error: 'templateId is required' },
        { status: 400 }
      );
    }

    // Get template
    const [template] = await db
      .select()
      .from(billingTemplates)
      .where(
        and(
          eq(billingTemplates.id, templateId),
          eq(billingTemplates.tenantId, member.tenantId)
        )
      )
      .limit(1);

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Prepare data for rendering
    let renderData = data || {};

    if (useSampleData || !data) {
      // Use sample data for preview
      renderData = {
        // Member variables
        member_name: 'John Doe',
        member_id: 'M12345',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com',
        phone: '(555) 123-4567',
        address: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zip: '12345',
        
        // Transaction variables
        amount: '125.00',
        due_date: new Date().toLocaleDateString(),
        period_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        period_end: new Date().toLocaleDateString(),
        late_fee: '10.00',
        total: '135.00',
        balance: '135.00',
        
        // Union variables
        union_name: 'Sample Union Local 123',
        union_address: '456 Union Blvd, Suite 100',
        contact_email: 'billing@union123.org',
        contact_phone: '(555) 987-6543',
        website: 'www.union123.org',
        
        // Payment variables
        payment_url: 'https://union123.org/pay',
        account_number: '****1234',
        routing_number: '****5678',
        
        // Dynamic variables
        current_date: new Date().toLocaleDateString(),
        invoice_number: 'INV-2024-001234',
        receipt_number: 'REC-2024-005678',
        
        ...renderData, // Override with provided data
      };
    }

    // Render template
    let renderedHtml = template.templateHtml;
    let renderedText = template.templateText;
    let renderedSubject = template.subject || '';

    // Replace all {variable} with actual values
    Object.keys(renderData).forEach(key => {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      const value = renderData[key] || '';
      renderedHtml = renderedHtml.replace(regex, value);
      renderedText = renderedText.replace(regex, value);
      renderedSubject = renderedSubject.replace(regex, value);
    });

    return NextResponse.json({
      message: 'Template rendered successfully',
      rendered: {
        html: renderedHtml,
        text: renderedText,
        subject: renderedSubject,
      },
      data: renderData,
    });

  } catch (error) {
    console.error('Preview template error:', error);
    return NextResponse.json(
      { error: 'Failed to preview template' },
      { status: 500 }
    );
  }
}
