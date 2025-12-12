/**
 * Phase 5B: Arbitration Precedent Documents API
 * Handles document uploads and retrieval for precedents
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';
import { logger } from '@/lib/logger';
import { db } from '@/db';
import { arbitrationPrecedents, organizations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import * as documentService from '@/lib/services/precedent-document-service';

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/arbitration/precedents/[id]/documents
 * Retrieve document URLs for a precedent
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const { id: precedentId } = await context.params;
  
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization from cookie
    const cookieStore = await cookies();
    const orgSlug = cookieStore.get('active-organization')?.value;
    if (!orgSlug) {
      return NextResponse.json(
        { error: 'No active organization found' },
        { status: 400 }
      );
    }

    // Convert slug to UUID
    const org = await db.query.organizations.findFirst({
      where: (o, { eq }) => eq(o.slug, orgSlug),
    });

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const userOrgId = org.id;

    // Fetch precedent
    const precedent = await db.query.arbitrationPrecedents.findFirst({
      where: eq(arbitrationPrecedents.id, precedentId),
    });

    if (!precedent) {
      return NextResponse.json({ error: 'Precedent not found' }, { status: 404 });
    }

    // For now, allow access to all documents
    // TODO: Implement proper access control based on sharing levels
    const documents = {
      precedentId,
      decisionDocument: {
        url: precedent.decisionDocumentUrl || null,
        available: !!precedent.decisionDocumentUrl,
      },
      redactedDocument: {
        url: precedent.redactedDocumentUrl || null,
        available: !!precedent.redactedDocumentUrl,
      },
    };

    return NextResponse.json(documents);
  } catch (error) {
    logger.error('Failed to retrieve precedent documents', error as Error, {
      precedentId,
      correlationId: request.headers.get('x-correlation-id'),
    });
    return NextResponse.json(
      { error: 'Failed to retrieve documents' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/arbitration/precedents/[id]/documents
 * Upload a document for a precedent
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const { id: precedentId } = await context.params;
  
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization from cookie
    const cookieStore = await cookies();
    const orgSlug = cookieStore.get('active-organization')?.value;
    if (!orgSlug) {
      return NextResponse.json(
        { error: 'No active organization found' },
        { status: 400 }
      );
    }

    // Convert slug to UUID
    const org = await db.query.organizations.findFirst({
      where: (o, { eq }) => eq(o.slug, orgSlug),
    });

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const userOrgId = org.id;

    // Fetch precedent and verify ownership
    const precedent = await db.query.arbitrationPrecedents.findFirst({
      where: eq(arbitrationPrecedents.id, precedentId),
    });

    if (!precedent) {
      return NextResponse.json({ error: 'Precedent not found' }, { status: 404 });
    }

    if (precedent.sourceOrganizationId !== userOrgId) {
      return NextResponse.json(
        { error: 'Only the source organization can upload documents' },
        { status: 403 }
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const documentType = formData.get('documentType') as string | null; // 'decision' or 'redacted'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!documentType || !['decision', 'redacted'].includes(documentType)) {
      return NextResponse.json(
        { error: 'Invalid documentType. Must be "decision" or "redacted"' },
        { status: 400 }
      );
    }

    // Validate file
    const validation = documentService.validatePrecedentDocument(file.size, file.type);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Generate secure filename
    const secureFilename = documentService.generateSecureFilename(file.name);

    // Convert File to Buffer for upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to blob storage
    const uploadResult = await documentService.uploadPrecedentDocument(buffer, {
      precedentId,
      organizationId: userOrgId,
      filename: secureFilename,
      contentType: file.type,
      isRedacted: documentType === 'redacted',
    });

    // Update precedent with document URL
    const updateField =
      documentType === 'decision' ? 'decisionDocumentUrl' : 'redactedDocumentUrl';
    
    // Delete old document if exists
    const oldUrl = precedent[updateField];
    if (oldUrl) {
      try {
        await documentService.deletePrecedentDocument(oldUrl);
      } catch (error) {
        logger.error('Failed to delete old precedent document', error as Error, {
          precedentId,
          organizationId: userOrgId,
          oldUrl,
        });
        // Continue even if delete fails
      }
    }

    await db
      .update(arbitrationPrecedents)
      .set({ [updateField]: uploadResult.url })
      .where(eq(arbitrationPrecedents.id, precedentId));

    // Extract metadata
    const metadata = documentService.extractDocumentMetadata(
      secureFilename,
      uploadResult.contentType,
      uploadResult.size
    );

    return NextResponse.json({
      message: 'Document uploaded successfully',
      document: {
        type: documentType,
        url: uploadResult.url,
        ...metadata,
      },
    });
  } catch (error) {
    logger.error('Failed to upload precedent document', error as Error, {
      precedentId,
      correlationId: request.headers.get('x-correlation-id'),
    });
    return NextResponse.json(
      { error: 'Failed to upload document' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/arbitration/precedents/[id]/documents
 * Delete a specific document from a precedent
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const { id: precedentId } = await context.params;
  
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization from cookie
    const cookieStore = await cookies();
    const orgSlug = cookieStore.get('active-organization')?.value;
    if (!orgSlug) {
      return NextResponse.json(
        { error: 'No active organization found' },
        { status: 400 }
      );
    }

    // Convert slug to UUID
    const org = await db.query.organizations.findFirst({
      where: (o, { eq }) => eq(o.slug, orgSlug),
    });

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const userOrgId = org.id;

    // Fetch precedent and verify ownership
    const precedent = await db.query.arbitrationPrecedents.findFirst({
      where: eq(arbitrationPrecedents.id, precedentId),
    });

    if (!precedent) {
      return NextResponse.json({ error: 'Precedent not found' }, { status: 404 });
    }

    if (precedent.sourceOrganizationId !== userOrgId) {
      return NextResponse.json(
        { error: 'Only the source organization can delete documents' },
        { status: 403 }
      );
    }

    // Get document type from query params
    const { searchParams } = new URL(request.url);
    const documentType = searchParams.get('documentType'); // 'decision' or 'redacted'

    if (!documentType || !['decision', 'redacted'].includes(documentType)) {
      return NextResponse.json(
        { error: 'Invalid documentType. Must be "decision" or "redacted"' },
        { status: 400 }
      );
    }

    // Get the document URL
    const urlField =
      documentType === 'decision' ? 'decisionDocumentUrl' : 'redactedDocumentUrl';
    const documentUrl = precedent[urlField];

    if (!documentUrl) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Delete from blob storage
    await documentService.deletePrecedentDocument(documentUrl);

    // Update precedent to remove URL
    await db
      .update(arbitrationPrecedents)
      .set({ [urlField]: null })
      .where(eq(arbitrationPrecedents.id, precedentId));

    return NextResponse.json({
      message: 'Document deleted successfully',
      documentType,
    });
  } catch (error) {
    logger.error('Failed to delete precedent document', error as Error, {
      precedentId,
      correlationId: request.headers.get('x-correlation-id'),
    });
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    );
  }
}
