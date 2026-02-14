/**
 * Document Generation API
 * 
 * Generates documents from templates with merge data
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { eq } from 'drizzle-orm';
import { caseTemplates, generatedDocuments } from '../templates/route';
import { requireUserForOrganization } from '@/lib/api-auth-guard';

// Validation schema for generating document
const generateDocumentSchema = z.object({
  templateId: z.string().uuid(),
  caseId: z.string().uuid(),
  caseType: z.string(),
  organizationId: z.string().uuid(),
  mergeData: z.record(z.any()),
  recipientName: z.string().optional(),
  recipientEmail: z.string().email().optional(),
  recipientAddress: z.string().optional(),
});

/**
 * POST /api/cases/templates/generate
 * Generate document from template
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = generateDocumentSchema.parse(body);
    const authContext = await requireUserForOrganization(validatedData.organizationId);

    // Get template
    const [template] = await db
      .select()
      .from(caseTemplates)
      .where(eq(caseTemplates.id, validatedData.templateId));

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Process merge fields (simple replacement for now)
    let renderedContent = template.body;
    let renderedSubject = template.subject || '';

    Object.entries(validatedData.mergeData).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      renderedContent = renderedContent.replace(regex, String(value));
      renderedSubject = renderedSubject.replace(regex, String(value));
    });

    // TODO: Generate PDF/DOCX using a library like puppeteer or docx
    // For now, we&apos;ll just store the HTML content
    const documentUrl = null; // Would be set after PDF generation

    // Create generated document record
    const [newDocument] = await db
      .insert(generatedDocuments)
      .values({
        templateId: validatedData.templateId,
        templateCode: template.templateCode,
        caseId: validatedData.caseId,
        caseType: validatedData.caseType,
        organizationId: validatedData.organizationId,
        subject: renderedSubject,
        content: renderedContent,
        documentUrl,
        mergeData: validatedData.mergeData,
        recipientName: validatedData.recipientName,
        recipientEmail: validatedData.recipientEmail,
        recipientAddress: validatedData.recipientAddress,
        status: 'generated',
        createdBy: authContext.userId,
      })
      .returning();

    // Update template usage count
    await db
      .update(caseTemplates)
      .set({
        usageCount: {
          total: (template.usageCount?.total || 0) + 1,
          lastUsed: new Date().toISOString(),
        },
        updatedAt: new Date(),
      })
      .where(eq(caseTemplates.id, validatedData.templateId));

    return NextResponse.json(
      {
        message: 'Document generated successfully',
        document: newDocument,
        previewHtml: renderedContent,
      },
      { status: 201 }
    );
  } catch (error: Record<string, unknown>) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message.startsWith('Forbidden')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error generating document:', error);
    return NextResponse.json(
      { error: 'Failed to generate document', details: error.message },
      { status: 500 }
    );
  }
}
