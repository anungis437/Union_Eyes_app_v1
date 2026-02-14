/**
 * Case Evidence API
 * 
 * Manages evidence files, documents, and evidence locker for grievances/cases
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createHash } from 'crypto';
import { db } from '@/db';
import { and, desc } from 'drizzle-orm';
import { pgTable, uuid, text, timestamp, integer, jsonb, boolean } from 'drizzle-orm/pg-core';
import { requireUserForOrganization } from '@/lib/api-auth-guard';

// Evidence schema (if not exists, this defines it)
export const caseEvidence = pgTable('case_evidence', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Case Reference
  caseId: uuid('case_id').notNull(),
  caseType: text('case_type').notNull(), // grievance, arbitration, investigation
  organizationId: uuid('organization_id').notNull(),
  
  // Document Details
  fileName: text('file_name').notNull(),
  fileUrl: text('file_url').notNull(),
  fileType: text('file_type').notNull(), // pdf, image, video, audio, document
  fileSize: integer('file_size'), // bytes
  fileHash: text('file_hash'), // SHA-256 for integrity
  
  // Metadata
  documentType: text('document_type'), // witness_statement, email, photo, video, medical_record, contract, policy, etc.
  description: text('description'),
  tags: jsonb('tags').$type<string[]>(),
  
  // Redaction
  needsRedaction: boolean('needs_redaction').default(false),
  redactedVersion: text('redacted_version'), // URL to redacted version
  redactedAt: timestamp('redacted_at'),
  redactedBy: text('redacted_by'),
  
  // Chain of Custody
  submittedBy: text('submitted_by').notNull(),
  collectedFrom: text('collected_from'), // Source of evidence
  collectedAt: timestamp('collected_at'),
  collectionMethod: text('collection_method'), // email, physical_copy, recording, photograph
  
  // Legal Hold
  onLegalHold: boolean('on_legal_hold').default(false),
  legalHoldId: uuid('legal_hold_id'),
  
  // Status
  status: text('status').notNull().default('active'), // active, redacted, archived, deleted
  
  // Metadata
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  
  // Audit
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  createdBy: text('created_by'),
  lastModifiedBy: text('last_modified_by'),
});

// Validation schema for uploading evidence
const uploadEvidenceSchema = z.object({
  caseId: z.string().uuid(),
  caseType: z.enum(['grievance', 'arbitration', 'investigation']),
  organizationId: z.string().uuid(),
  fileName: z.string(),
  fileUrl: z.string().url(),
  fileType: z.string(),
  fileSize: z.number().int().optional(),
  documentType: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  needsRedaction: z.boolean().default(false),
  collectedFrom: z.string().optional(),
  collectedAt: z.string().optional(),
  collectionMethod: z.string().optional(),
});

/**
 * Generate SHA-256 hash from file content
 * Note: In production, this should be called during file upload on the server
 * For files already stored, this would need to fetch and hash the content
 */
async function generateFileHash(fileUrl: string): Promise<string | null> {
  try {
    // Fetch file content
    const response = await fetch(fileUrl);
    if (!response.ok) return null;
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Generate SHA-256 hash
    const hash = createHash('sha256').update(buffer).digest('hex');
    return hash;
  } catch (error) {
    console.error('Error generating file hash:', error);
    return null;
  }
}

/**
 * GET /api/cases/evidence
 * List evidence with filters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get('caseId');
    const caseType = searchParams.get('caseType');
    const organizationId = searchParams.get('organizationId');
    const documentType = searchParams.get('documentType');
    const needsRedaction = searchParams.get('needsRedaction');
    const onLegalHold = searchParams.get('onLegalHold');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // Build query conditions
    const conditions = [];
    if (caseId) {
      conditions.push(eq(caseEvidence.caseId, caseId));
    }
    if (caseType) {
      conditions.push(eq(caseEvidence.caseType, caseType));
    }
    if (organizationId) {
      conditions.push(eq(caseEvidence.organizationId, organizationId));
    }
    if (documentType) {
      conditions.push(eq(caseEvidence.documentType, documentType));
    }
    if (needsRedaction === 'true') {
      conditions.push(eq(caseEvidence.needsRedaction, true));
    }
    if (onLegalHold === 'true') {
      conditions.push(eq(caseEvidence.onLegalHold, true));
    }

    // Fetch evidence
    const evidence = await db
      .select()
      .from(caseEvidence)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(caseEvidence.createdAt))
      .limit(limit)
      .offset(offset);

    // Count total
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(caseEvidence)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return NextResponse.json({
      evidence,
      pagination: {
        page,
        limit,
        total: Number(count),
        totalPages: Math.ceil(Number(count) / limit),
      },
    });
  } catch (error: Record<string, unknown>) {
    console.error('Error fetching evidence:', error);
    return NextResponse.json(
      { error: 'Failed to fetch evidence', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cases/evidence
 * Upload new evidence
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = uploadEvidenceSchema.parse(body);
    const authContext = await requireUserForOrganization(validatedData.organizationId);

    // Generate file hash for integrity verification
    const fileHash = await generateFileHash(validatedData.fileUrl);

    // Create evidence record
    const [newEvidence] = await db
      .insert(caseEvidence)
      .values({
        ...validatedData,
        fileHash,
        collectedAt: validatedData.collectedAt ? new Date(validatedData.collectedAt) : null,
        submittedBy: authContext.userId,
        status: 'active',
        createdBy: authContext.userId,
        lastModifiedBy: authContext.userId,
      })
      .returning();

    return NextResponse.json(
      {
        message: 'Evidence uploaded successfully',
        evidence: newEvidence,
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
    console.error('Error uploading evidence:', error);
    return NextResponse.json(
      { error: 'Failed to upload evidence', details: error.message },
      { status: 500 }
    );
  }
}
