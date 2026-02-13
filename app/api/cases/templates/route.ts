/**
 * Case Templates API
 * 
 * Manages letter templates and document generation for cases
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { eq, and, desc, like, sql } from 'drizzle-orm';
import { pgTable, uuid, text, timestamp, jsonb, boolean } from 'drizzle-orm/pg-core';

// Case templates schema
export const caseTemplates = pgTable('case_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Template Details
  templateName: text('template_name').notNull(),
  templateCode: text('template_code').notNull().unique(), // intake_acknowledgment, step_1_notice, arbitration_demand, etc.
  category: text('category').notNull(), // letter, notice, form, report
  templateType: text('template_type').notNull(), // intake, step_meeting, arbitration, settlement, investigation
  
  // Scope
  organizationId: uuid('organization_id'),
  localId: uuid('local_id'),
  
  // Content
  subject: text('subject'), // For letters/emails
  body: text('body').notNull(), // Template content with merge fields
  footer: text('footer'),
  
  // Merge Fields (variables)
  mergeFields: jsonb('merge_fields').$type<{
    field: string;
    label: string;
    type: 'text' | 'date' | 'number' | 'boolean';
    required: boolean;
    defaultValue?: string;
  }[]>(),
  
  // Format
  outputFormat: text('output_format').notNull().default('pdf'), // pdf, docx, html, txt
  
  // Styling
  styles: jsonb('styles').$type<{
    fontSize?: number;
    fontFamily?: string;
    lineHeight?: number;
    margins?: { top: number; bottom: number; left: number; right: number };
    headerImage?: string;
    footerText?: string;
  }>(),
  
  // Usage
  usageCount: jsonb('usage_count').$type<{ total: number; lastUsed: string }>(),
  
  // Status
  isActive: boolean('is_active').default(true),
  isDefault: boolean('is_default').default(false), // Default template for this type
  
  // Version Control
  version: text('version').default('1.0'),
  previousVersionId: uuid('previous_version_id'),
  
  // Metadata
  description: text('description'),
  metadata: jsonb('metadata').$type<Record<string, any>>(),
  
  // Audit
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  createdBy: text('created_by'),
  lastModifiedBy: text('last_modified_by'),
});

// Generated documents from templates
export const generatedDocuments = pgTable('generated_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Template Reference
  templateId: uuid('template_id').notNull(),
  templateCode: text('template_code').notNull(),
  
  // Case Reference
  caseId: uuid('case_id').notNull(),
  caseType: text('case_type').notNull(),
  organizationId: uuid('organization_id').notNull(),
  
  // Generated Content
  subject: text('subject'),
  content: text('content'), // Rendered HTML/text
  documentUrl: text('document_url'), // Final PDF/DOCX URL
  
  // Merge Data Used
  mergeData: jsonb('merge_data').$type<Record<string, any>>(),
  
  // Recipient (for letters)
  recipientName: text('recipient_name'),
  recipientEmail: text('recipient_email'),
  recipientAddress: text('recipient_address'),
  
  // Delivery
  deliveryMethod: text('delivery_method'), // email, mail, in_person, fax
  deliveredAt: timestamp('delivered_at'),
  deliveredBy: text('delivered_by'),
  
  // Status
  status: text('status').notNull().default('draft'), // draft, generated, sent, delivered, failed
  
  // Metadata
  metadata: jsonb('metadata').$type<Record<string, any>>(),
  
  // Audit
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  createdBy: text('created_by'),
});

// Validation schema for creating template
const createTemplateSchema = z.object({
  templateName: z.string().min(1),
  templateCode: z.string().min(1),
  category: z.enum(['letter', 'notice', 'form', 'report']),
  templateType: z.string(),
  organizationId: z.string().uuid().optional(),
  subject: z.string().optional(),
  body: z.string().min(1),
  footer: z.string().optional(),
  mergeFields: z.array(z.object({
    field: z.string(),
    label: z.string(),
    type: z.enum(['text', 'date', 'number', 'boolean']),
    required: z.boolean(),
    defaultValue: z.string().optional(),
  })).optional(),
  outputFormat: z.enum(['pdf', 'docx', 'html', 'txt']).default('pdf'),
  description: z.string().optional(),
});

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
 * GET /api/cases/templates
 * List case templates with filters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const category = searchParams.get('category');
    const templateType = searchParams.get('templateType');
    const search = searchParams.get('search');
    const isActive = searchParams.get('isActive');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // Build query conditions
    const conditions = [];
    if (organizationId) {
      conditions.push(eq(caseTemplates.organizationId, organizationId));
    }
    if (category) {
      conditions.push(eq(caseTemplates.category, category));
    }
    if (templateType) {
      conditions.push(eq(caseTemplates.templateType, templateType));
    }
    if (search) {
      conditions.push(like(caseTemplates.templateName, `%${search}%`));
    }
    if (isActive !== null) {
      conditions.push(eq(caseTemplates.isActive, isActive === 'true'));
    }

    // Fetch templates
    const templates = await db
      .select()
      .from(caseTemplates)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(caseTemplates.createdAt))
      .limit(limit)
      .offset(offset);

    // Count total
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(caseTemplates)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return NextResponse.json({
      templates,
      pagination: {
        page,
        limit,
        total: Number(count),
        totalPages: Math.ceil(Number(count) / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cases/templates
 * Create new template
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createTemplateSchema.parse(body);

    // Create template
    const [newTemplate] = await db
      .insert(caseTemplates)
      .values({
        ...validatedData,
        usageCount: { total: 0, lastUsed: '' },
        isActive: true,
        version: '1.0',
        createdBy: 'system', // TODO: Get from auth
        lastModifiedBy: 'system',
      })
      .returning();

    return NextResponse.json(
      {
        message: 'Template created successfully',
        template: newTemplate,
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating template:', error);
    return NextResponse.json(
      { error: 'Failed to create template', details: error.message },
      { status: 500 }
    );
  }
}
