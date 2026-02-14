/**
 * Member Documents API
 * 
 * Manages member document storage (certifications, licenses, training records)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { and, desc } from 'drizzle-orm';
import { memberDocuments } from '@/db/schema/member-profile-v2-schema';
import { requireUser } from '@/lib/api-auth-guard';

// Validation schema
const uploadDocumentSchema = z.object({
  documentType: z.enum(['certification', 'license', 'medical', 'identification', 'training', 'contract']),
  documentName: z.string(),
  documentNumber: z.string().optional(),
  fileUrl: z.string().url(),
  fileName: z.string(),
  fileSize: z.number().optional(),
  mimeType: z.string().optional(),
  issueDate: z.string().datetime().optional(),
  expiryDate: z.string().datetime().optional(),
  confidentialityLevel: z.enum(['public', 'internal', 'confidential', 'restricted']).optional(),
  tags: z.array(z.string()).optional(),
});

/**
 * GET /api/members/[id]/documents
 * Get member documents
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id;
    const { searchParams } = new URL(request.url);
    const documentType = searchParams.get('type');

    const conditions = [eq(memberDocuments.userId, userId)];
    
    if (documentType) {
      conditions.push(eq(memberDocuments.documentType, documentType));
    }

    const documents = await db
      .select()
      .from(memberDocuments)
      .where(and(...conditions))
      .orderBy(desc(memberDocuments.createdAt));

    // Check for expired documents
    const now = new Date();
    documents.forEach(doc => {
      if (doc.expiryDate && new Date(doc.expiryDate) < now) {
        doc.isExpired = true;
      }
    });

    return NextResponse.json({
      documents,
      summary: {
        total: documents.length,
        expired: documents.filter(d => d.isExpired).length,
        verified: documents.filter(d => d.verified).length,
      },
    });
  } catch (error: Record<string, unknown>) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/members/[id]/documents
 * Upload new document
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id;
    const body = await request.json();
    const validatedData = uploadDocumentSchema.parse(body);
    const authContext = await requireUser();

    if (!authContext.organizationId) {
      return NextResponse.json(
        { error: 'Organization context required' },
        { status: 403 }
      );
    }

    // Check if expired
    const isExpired = validatedData.expiryDate && 
      new Date(validatedData.expiryDate) < new Date();

    const [document] = await db
      .insert(memberDocuments)
      .values({
        userId,
        organizationId: authContext.organizationId,
        ...validatedData,
        isExpired: isExpired || false,
        confidentialityLevel: validatedData.confidentialityLevel || 'internal',
        uploadedBy: authContext.userId,
      })
      .returning();

    console.log(`✅ Document uploaded: ${validatedData.documentName}`);

    return NextResponse.json(
      {
        message: 'Document uploaded successfully',
        document,
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
    console.error('Error uploading document:', error);
    return NextResponse.json(
      { error: 'Failed to upload document', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/members/[id]/documents/[documentId]/verify
 * Verify a document
 */
export async function verifyDocument(
  documentId: string,
  userId: string,
  verifiedBy: string,
  notes?: string
) {
  const [verified] = await db
    .update(memberDocuments)
    .set({
      verified: true,
      verifiedBy,
      verifiedAt: new Date(),
      verificationNotes: notes,
      updatedAt: new Date(),
    })
    .where(and(
      eq(memberDocuments.id, documentId),
      eq(memberDocuments.userId, userId)
    ))
    .returning();

  return verified;
}
