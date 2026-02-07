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
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";

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
            timestamp: new Date().toISOString(), userId,
            endpoint: `/api/documents/${params.id}`,
            method: 'GET',
            eventType: 'validation_failed',
            severity: 'low',
            details: { reason: 'Document not found', documentId: params.id },
          });
          return NextResponse.json({ error: "Document not found" }, { status: 404 });
        }

        if (versions) {
          const versionHistory = await getDocumentVersions(params.id);
          logApiAuditEvent({
            timestamp: new Date().toISOString(), userId,
            endpoint: `/api/documents/${params.id}`,
            method: 'GET',
            eventType: 'success',
            severity: 'low',
            details: { documentId: params.id, includeVersions: true, versionCount: versionHistory?.length || 0 },
          });
          return NextResponse.json({ ...document, versions: versionHistory });
        }

        logApiAuditEvent({
          timestamp: new Date().toISOString(), userId,
          endpoint: `/api/documents/${params.id}`,
          method: 'GET',
          eventType: 'success',
          severity: 'low',
          details: { documentId: params.id },
        });

        return NextResponse.json(document);
      } catch (error) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(), userId,
          endpoint: `/api/documents/${params.id}`,
          method: 'GET',
          eventType: 'server_error',
          severity: 'high',
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
        });
        console.error("Error fetching document:", error);
        return NextResponse.json(
          { error: "Failed to fetch document", details: error instanceof Error ? error.message : "Unknown error" },
          { status: 500 }
        );
      }
      })(request, { params });
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
  return withEnhancedRoleAuth(20, async (request, context) => {
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    const parsed = updateDocumentSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const body = parsed.data;
    const { userId, organizationId } = context;

    const orgId = (body as Record<string, unknown>)["organizationId"] ?? (body as Record<string, unknown>)["orgId"] ?? (body as Record<string, unknown>)["organization_id"] ?? (body as Record<string, unknown>)["org_id"] ?? (body as Record<string, unknown>)["tenantId"] ?? (body as Record<string, unknown>)["tenant_id"] ?? (body as Record<string, unknown>)["unionId"] ?? (body as Record<string, unknown>)["union_id"] ?? (body as Record<string, unknown>)["localId"] ?? (body as Record<string, unknown>)["local_id"];
    if (typeof orgId === 'string' && orgId.length > 0 && orgId !== context.organizationId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

  try {
          const updated = await updateDocument(params.id, body);
          
          if (!updated) {
            logApiAuditEvent({
              timestamp: new Date().toISOString(), userId,
              endpoint: `/api/documents/${params.id}`,
              method: 'PATCH',
              eventType: 'validation_failed',
              severity: 'low',
              details: { reason: 'Document not found', documentId: params.id },
            });
            return NextResponse.json({ error: "Document not found" }, { status: 404 });
          }

          logApiAuditEvent({
            timestamp: new Date().toISOString(), userId,
            endpoint: `/api/documents/${params.id}`,
            method: 'PATCH',
            eventType: 'success',
            severity: 'medium',
            details: { documentId: params.id, updatedFields: Object.keys(body) },
          });

          return NextResponse.json(updated);
        } catch (error) {
          logApiAuditEvent({
            timestamp: new Date().toISOString(), userId,
            endpoint: `/api/documents/${params.id}`,
            method: 'PATCH',
            eventType: 'server_error',
            severity: 'high',
            details: { error: error instanceof Error ? error.message : 'Unknown error' },
          });
          console.error("Error updating document:", error);
          return NextResponse.json(
            { error: "Failed to update document", details: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
          );
        }
        })(request, { params });
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
  return withEnhancedRoleAuth(20, async (request, context) => {
    const { userId, organizationId } = context;

  try {
        const { searchParams } = new URL(request.url);
        const permanent = searchParams.get("permanent") === "true";

        const success = permanent
          ? await permanentlyDeleteDocument(params.id)
          : await deleteDocument(params.id);

        if (!success) {
          logApiAuditEvent({
            timestamp: new Date().toISOString(), userId,
            endpoint: `/api/documents/${params.id}`,
            method: 'DELETE',
            eventType: 'validation_failed',
            severity: 'low',
            details: { reason: 'Document not found', documentId: params.id },
          });
          return NextResponse.json({ error: "Document not found" }, { status: 404 });
        }

        logApiAuditEvent({
          timestamp: new Date().toISOString(), userId,
          endpoint: `/api/documents/${params.id}`,
          method: 'DELETE',
          eventType: 'success',
          severity: 'high',
          details: { documentId: params.id, permanent },
        });

        return NextResponse.json({ success: true, message: "Document deleted successfully" });
      } catch (error) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(), userId,
          endpoint: `/api/documents/${params.id}`,
          method: 'DELETE',
          eventType: 'server_error',
          severity: 'high',
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
        });
        console.error("Error deleting document:", error);
        return NextResponse.json(
          { error: "Failed to delete document", details: error instanceof Error ? error.message : "Unknown error" },
          { status: 500 }
        );
      }
      })(request, { params });
};

