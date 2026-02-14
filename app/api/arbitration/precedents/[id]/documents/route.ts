import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * Phase 5B: Arbitration Precedent Documents API
 * Handles document uploads and retrieval for precedents
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { db } from '@/db';
import { arbitrationPrecedents, organizations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import * as documentService from '@/lib/services/precedent-document-service';
import { withApiAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { withRLSContext } from '@/lib/db/with-rls-context';

import { standardSuccessResponse } from '@/lib/api/standardized-responses';
type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * Check if user's organization can access a precedent based on sharing level
 */
async function checkPrecedentAccess(
  precedent: Record<string, unknown>,
  userOrgId: string
): Promise<boolean> {
  // Owner always has access
  if (precedent.sourceOrganizationId === userOrgId || precedent.organizationId === userOrgId) {
    return true;
  }

  const sharingLevel = precedent.sharingLevel;

  switch (sharingLevel) {
    case "private":
      // Check explicit grants
      return precedent.sharedWithOrgIds?.includes(userOrgId) || false;
    
    case "federation":
      // Federation hierarchy check (not yet implemented)
      return false;
    
    case "congress":
      // Check CLC membership: both user's org and source org must be CLC-affiliated
      try {
        const sourceOrgId = precedent.sourceOrganizationId || precedent.organizationId;
        const [userOrg, sourceOrg] = await Promise.all([
          db.selectDistinct().from(organizations).where(eq(organizations.id, userOrgId)).limit(1),
          db.selectDistinct().from(organizations).where(eq(organizations.id, sourceOrgId)).limit(1)
        ]);
        
        const userOrgData = userOrg[0];
        const sourceOrgData = sourceOrg[0];
        
        // Both orgs must be CLC-affiliated with active status
        return (
          userOrgData?.clcAffiliated === true &&
          userOrgData?.status === 'active' &&
          sourceOrgData?.clcAffiliated === true &&
          sourceOrgData?.status === 'active'
        );
      } catch (error) {
        logger.error('Error checking CLC membership:', error);
        return false;
      }
    
    case "public":
      // Everyone can access
      return true;
    
    default:
      return false;
  }
}

export const GET = async (request: NextRequest, context: RouteContext) => {
  return withRoleAuth(10, async (request, context) => {
    const { organizationId } = context;

  const { id: precedentId } = await context.params;
    
    try {
      // Validate organization context
      if (!organizationId) {
        return NextResponse.json(
          { error: 'No active organization found' },
          { status: 400 }
        );
      }

      const userOrgId = organizationId;

      // Fetch precedent
      const precedent = await withRLSContext({ organizationId: userOrgId }, async (db) => {
        return await db.query.arbitrationPrecedents.findFirst({
          where: eq(arbitrationPrecedents.id, precedentId),
        });
      });

      if (!precedent) {
        return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Precedent not found'
    );
      }

      // Implement access control based on sharing levels
      const hasAccess = await checkPrecedentAccess(precedent, userOrgId);
      
      if (!hasAccess) {
        return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Access denied to precedent documents'
    );
      }

      // Return appropriate documents based on access level
      const isOwner = precedent.organizationId === userOrgId;
      const documents = {
        precedentId,
        decisionDocument: {
          url: isOwner ? (precedent.documentUrl || null) : (precedent.redactedDocumentUrl || null),
          available: isOwner ? !!precedent.documentUrl : !!precedent.redactedDocumentUrl,
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
      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to retrieve documents',
      error
    );
    }
    })(request, { params });
};

export const POST = async (request: NextRequest, context: RouteContext) => {
  return withRoleAuth(20, async (request, context) => {
    const { organizationId } = context;

  const { id: precedentId } = await context.params;
    
    try {
      // Validate organization context
      if (!organizationId) {
        return NextResponse.json(
          { error: 'No active organization found' },
          { status: 400 }
        );
      }

      const userOrgId = organizationId;

      // Fetch precedent and verify ownership
      const precedent = await withRLSContext({ organizationId: userOrgId }, async (db) => {
        return await db.query.arbitrationPrecedents.findFirst({
          where: eq(arbitrationPrecedents.id, precedentId),
        });
      });

      if (!precedent) {
        return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Precedent not found'
    );
      }

      if (precedent.sourceOrganizationId !== userOrgId) {
        return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Only the source organization can upload documents'
    );
      }

      // Parse multipart form data
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const documentType = formData.get('documentType') as string | null; // 'decision' or 'redacted'

      if (!file) {
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'No file provided'
    );
      }

      if (!documentType || !['decision', 'redacted'].includes(documentType)) {
        return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid documentType. Must be '
    );
      }

      // Validate file
      const validation = documentService.validatePrecedentDocument(file.size, file.type);
      if (!validation.valid) {
        return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      validation.error
    );
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
        documentType === 'decision' ? 'documentUrl' : 'redactedDocumentUrl';
      
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

      await withRLSContext({ organizationId: userOrgId }, async (db) => {
        return await db
          .update(arbitrationPrecedents)
          .set({ [updateField]: uploadResult.url })
          .where(eq(arbitrationPrecedents.id, precedentId));
      });

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
      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to upload document',
      error
    );
    }
    })(request, { params });
};

export const DELETE = async (request: NextRequest, context: RouteContext) => {
  return withRoleAuth(20, async (request, context) => {
    const { organizationId } = context;

  const { id: precedentId } = await context.params;
    
    try {
      // Validate organization context
      if (!organizationId) {
        return NextResponse.json(
          { error: 'No active organization found' },
          { status: 400 }
        );
      }

      const userOrgId = organizationId;

      // Fetch precedent and verify ownership
      const precedent = await withRLSContext({ organizationId: userOrgId }, async (db) => {
        return await db.query.arbitrationPrecedents.findFirst({
          where: eq(arbitrationPrecedents.id, precedentId),
        });
      });

      if (!precedent) {
        return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Precedent not found'
    );
      }

      if (precedent.sourceOrganizationId !== userOrgId) {
        return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Only the source organization can delete documents'
    );
      }

      // Get document type from query params
      const { searchParams } = new URL(request.url);
      const documentType = searchParams.get('documentType'); // 'decision' or 'redacted'

      if (!documentType || !['decision', 'redacted'].includes(documentType)) {
        return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid documentType. Must be '
    );
      }

      // Get the document URL
      const urlField =
        documentType === 'decision' ? 'documentUrl' : 'redactedDocumentUrl';
      const documentUrl = precedent[urlField];

      if (!documentUrl) {
        return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Document not found'
    );
      }

      // Delete from blob storage
      await documentService.deletePrecedentDocument(documentUrl);

      // Update precedent to remove URL
      await withRLSContext({ organizationId: userOrgId }, async (db) => {
        return await db
          .update(arbitrationPrecedents)
          .set({ [urlField]: null })
          .where(eq(arbitrationPrecedents.id, precedentId));
      });

      return NextResponse.json({
        message: 'Document deleted successfully',
        documentType,
      });
    } catch (error) {
      logger.error('Failed to delete precedent document', error as Error, {
        precedentId,
        correlationId: request.headers.get('x-correlation-id'),
      });
      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to delete document',
      error
    );
    }
    })(request, { params });
};
