/**
 * Document Detail API Routes
 * GET /api/documents/[id] - Get document by ID
 * PATCH /api/documents/[id] - Update document
 * DELETE /api/documents/[id] - Delete document
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { 
  getDocumentById, 
  updateDocument, 
  deleteDocument,
  permanentlyDeleteDocument,
  getDocumentVersions
} from "@/lib/services/document-service";
import { withEnhancedRoleAuth } from "@/lib/api-auth-guard";

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
/**
 * Validation schema for updating documents
 */
const updateDocumentSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  category: z.string().optional().nullable(),
  isConfidential: z.boolean().optional(),
  accessLevel: z.enum(['standard', 'restricted', 'confidential']).optional(),
  folderId: z.string().uuid().optional().nullable(),
  metadata: z.record(z.any()).optional(),
});

/**
 * GET /api/documents/[id]
 * Get document by ID
 * 
 * Query params:
 * - includeFolder: boolean
 * - versions: boolean - include version history
 */
export const GET = async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  return withEnhancedRoleAuth(10, async (request, context) => {
    const { userId, organizationId } = context;

  try {
    const { searchParams } = new URL(request.url);
    const includeFolder = searchParams.get("includeFolder") === "true";
    const versions = searchParams.get("versions") === "true";

    const document = await getDocumentById(params.id, includeFolder);
    
    if (!document) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(), 
        userId,
        endpoint: `/api/documents/${params.id}`,
        method: 'GET',
        eventType: 'validation_failed',
        severity: 'low',
        dataType: 'DOCUMENTS',
        details: { reason: 'Document not found', documentId: params.id },
      });
      return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Document not found'
    );
    }

    // Verify organization access
    if (document.organizationId !== organizationId) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: `/api/documents/${params.id}`,
        method: 'GET',
        eventType: 'authorization_failed',
        severity: 'high',
        dataType: 'DOCUMENTS',
        details: { reason: 'Organization ID mismatch', documentId: params.id },
      });
      return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Forbidden'
    );
    }

    if (versions) {
      const versionHistory = await getDocumentVersions(params.id);
      logApiAuditEvent({
        timestamp: new Date().toISOString(), 
        userId,
        endpoint: `/api/documents/${params.id}`,
        method: 'GET',
        eventType: 'success',
        severity: 'low',
        dataType: 'DOCUMENTS',
        details: { documentId: params.id, includeVersions: true, versionCount: versionHistory?.length || 0 },
      });
      return NextResponse.json({ ...document, versions: versionHistory });
    }

    logApiAuditEvent({
      timestamp: new Date().toISOString(), 
      userId,
      endpoint: `/api/documents/${params.id}`,
      method: 'GET',
      eventType: 'success',
      severity: 'low',
      dataType: 'DOCUMENTS',
      details: { documentId: params.id },
    });

    return NextResponse.json(document);
  } catch (error) {
    logApiAuditEvent({
      timestamp: new Date().toISOString(), 
      userId,
      endpoint: `/api/documents/${params.id}`,
      method: 'GET',
      eventType: 'server_error',
      severity: 'high',
      dataType: 'DOCUMENTS',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
    });
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch document',
      error
    );
  }
  })(request);
};

/**
 * PATCH /api/documents/[id]
 * Update document
 * 
 * Body: Partial document fields to update
 */
export const PATCH = async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  return withEnhancedRoleAuth(40, async (request, context) => {
    const { userId, organizationId } = context;

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    logApiAuditEvent({
      timestamp: new Date().toISOString(),
      userId,
      endpoint: `/api/documents/${params.id}`,
      method: 'PATCH',
      eventType: 'validation_failed',
      severity: 'low',
      dataType: 'DOCUMENTS',
      details: { reason: 'Invalid JSON in request body' },
    });
    return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid JSON in request body',
      error
    );
  }

  const parsed = updateDocumentSchema.safeParse(rawBody);
  if (!parsed.success) {
    logApiAuditEvent({
      timestamp: new Date().toISOString(),
      userId,
      endpoint: `/api/documents/${params.id}`,
      method: 'PATCH',
      eventType: 'validation_failed',
      severity: 'low',
      dataType: 'DOCUMENTS',
      details: { reason: 'Validation failed', errors: parsed.error.errors },
    });
    return NextResponse.json({ 
      error: 'Invalid request body',
      details: parsed.error.errors
    }, { status: 400 });
  }

  const body = parsed.data;

  try {
    // First, get the document to verify ownership
    const document = await getDocumentById(params.id);
    if (!document) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(), 
        userId,
        endpoint: `/api/documents/${params.id}`,
        method: 'PATCH',
        eventType: 'validation_failed',
        severity: 'low',
        dataType: 'DOCUMENTS',
        details: { reason: 'Document not found', documentId: params.id },
      });
      return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Document not found'
    );
    }

    // Verify organization access
    if (document.organizationId !== organizationId) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: `/api/documents/${params.id}`,
        method: 'PATCH',
        eventType: 'authorization_failed',
        severity: 'high',
        dataType: 'DOCUMENTS',
        details: { reason: 'Organization ID mismatch', documentId: params.id },
      });
      return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Forbidden'
    );
    }

    const updated = await updateDocument(params.id, body);

    logApiAuditEvent({
      timestamp: new Date().toISOString(), 
      userId,
      endpoint: `/api/documents/${params.id}`,
      method: 'PATCH',
      eventType: 'success',
      severity: 'medium',
      dataType: 'DOCUMENTS',
      details: { documentId: params.id, updatedFields: Object.keys(body) },
    });

    return NextResponse.json(updated);
  } catch (error) {
    logApiAuditEvent({
      timestamp: new Date().toISOString(), 
      userId,
      endpoint: `/api/documents/${params.id}`,
      method: 'PATCH',
      eventType: 'server_error',
      severity: 'high',
      dataType: 'DOCUMENTS',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
    });
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to update document',
      error
    );
  }
  })(request);
};

/**
 * DELETE /api/documents/[id]
 * Delete document (soft delete by default)
 * 
 * Query params:
 * - permanent: boolean - permanently delete (hard delete)
 */
export const DELETE = async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  return withEnhancedRoleAuth(60, async (request, context) => {
    const { userId, organizationId } = context;

  try {
    const { searchParams } = new URL(request.url);
    const permanent = searchParams.get("permanent") === "true";

    // First, get the document to verify ownership
    const document = await getDocumentById(params.id);
    if (!document) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(), 
        userId,
        endpoint: `/api/documents/${params.id}`,
        method: 'DELETE',
        eventType: 'validation_failed',
        severity: 'low',
        dataType: 'DOCUMENTS',
        details: { reason: 'Document not found', documentId: params.id },
      });
      return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Document not found'
    );
    }

    // Verify organization access
    if (document.organizationId !== organizationId) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: `/api/documents/${params.id}`,
        method: 'DELETE',
        eventType: 'authorization_failed',
        severity: 'high',
        dataType: 'DOCUMENTS',
        details: { reason: 'Organization ID mismatch', documentId: params.id },
      });
      return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Forbidden'
    );
    }

    const success = permanent
      ? await permanentlyDeleteDocument(params.id)
      : await deleteDocument(params.id);

    if (!success) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(), 
        userId,
        endpoint: `/api/documents/${params.id}`,
        method: 'DELETE',
        eventType: 'server_error',
        severity: 'high',
        dataType: 'DOCUMENTS',
        details: { reason: 'Delete operation failed', documentId: params.id },
      });
      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to delete document'
    );
    }

    logApiAuditEvent({
      timestamp: new Date().toISOString(), 
      userId,
      endpoint: `/api/documents/${params.id}`,
      method: 'DELETE',
      eventType: 'success',
      severity: 'high',
      dataType: 'DOCUMENTS',
      details: { documentId: params.id, permanent },
    });

    return NextResponse.json({ success: true, message: "Document deleted successfully" });
  } catch (error) {
    logApiAuditEvent({
      timestamp: new Date().toISOString(), 
      userId,
      endpoint: `/api/documents/${params.id}`,
      method: 'DELETE',
      eventType: 'server_error',
      severity: 'high',
      dataType: 'DOCUMENTS',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
    });
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to delete document',
      error
    );
  }
  })(request);
};

