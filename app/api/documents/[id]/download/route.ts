/**
 * Document Download API Route
 * GET /api/documents/[id]/download - Download document file
 */

import { NextRequest, NextResponse } from "next/server";
import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { getDocumentById } from "@/lib/services/document-service";
import { withEnhancedRoleAuth } from "@/lib/api-auth-guard";
import { checkRateLimit, RATE_LIMITS, createRateLimitHeaders } from "@/lib/rate-limiter";

/**
 * GET /api/documents/[id]/download
 * Download a document file
 * 
 * Returns a redirect to the file URL or streams the file
 */
export const GET = async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  return withEnhancedRoleAuth(10, async (request, context) => {
    const { userId, organizationId } = context;

  try {
    // Rate limiting
    const rateLimitResult = await checkRateLimit(
      `doc-download:${userId}`,
      RATE_LIMITS.DOCUMENT_DOWNLOAD
    );

    if (!rateLimitResult.allowed) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: `/api/documents/${params.id}/download`,
        method: 'GET',
        eventType: 'rate_limit_exceeded',
        severity: 'medium',
        dataType: 'DOCUMENTS',
        details: { 
          documentId: params.id,
          resetIn: rateLimitResult.resetIn 
        },
      });
      
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          message: `Too many download requests. Please try again in ${rateLimitResult.resetIn} seconds.`,
          resetIn: rateLimitResult.resetIn 
        },
        { 
          status: 429,
          headers: createRateLimitHeaders(rateLimitResult)
        }
      );
    }

    const document = await getDocumentById(params.id);
    
    if (!document) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(), 
        userId,
        endpoint: `/api/documents/${params.id}/download`,
        method: 'GET',
        eventType: 'validation_failed',
        severity: 'low',
        dataType: 'DOCUMENTS',
        details: { reason: 'Document not found', documentId: params.id },
      });
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Verify organization access
    if (document.tenantId !== organizationId) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: `/api/documents/${params.id}/download`,
        method: 'GET',
        eventType: 'authorization_failed',
        severity: 'high',
        dataType: 'DOCUMENTS',
        details: { reason: 'Organization ID mismatch', documentId: params.id },
      });
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check access level permissions
    if (document.isConfidential || document.accessLevel === 'confidential') {
      // Could add additional role checks here for confidential documents
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: `/api/documents/${params.id}/download`,
        method: 'GET',
        eventType: 'access_attempt',
        severity: 'medium',
        dataType: 'DOCUMENTS',
        details: { 
          documentId: params.id,
          confidential: true,
          accessLevel: document.accessLevel 
        },
      });
    }

    logApiAuditEvent({
      timestamp: new Date().toISOString(), 
      userId,
      endpoint: `/api/documents/${params.id}/download`,
      method: 'GET',
      eventType: 'success',
      severity: 'low',
      dataType: 'DOCUMENTS',
      details: { 
        documentId: params.id,
        fileName: document.name,
        fileType: document.fileType,
        fileSize: document.fileSize 
      },
    });

    // Return redirect to the file URL
    // In production, you might want to generate a signed URL with expiration
    return NextResponse.redirect(document.fileUrl);
  } catch (error) {
    logApiAuditEvent({
      timestamp: new Date().toISOString(), 
      userId,
      endpoint: `/api/documents/${params.id}/download`,
      method: 'GET',
      eventType: 'server_error',
      severity: 'high',
      dataType: 'DOCUMENTS',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
    });
return NextResponse.json(
      { error: "Failed to download document", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
  })(request);
};
