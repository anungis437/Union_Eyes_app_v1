/**
 * Documents API Routes - Main endpoints for document management
 * GET /api/documents - List documents with filtering and pagination
 * POST /api/documents - Upload/create a new document
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { 
  listDocuments, 
  createDocument, 
  searchDocuments,
  getDocumentStatistics 
} from "@/lib/services/document-service";
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";

/**
 * Validation schema for creating documents
 */
const createDocumentSchema = z.object({
  tenantId: z.string().uuid('Invalid tenant ID'),
  folderId: z.string().uuid().optional().nullable(),
  name: z.string().min(1, 'Name is required'),
  fileUrl: z.string().url('Invalid file URL'),
  fileSize: z.number().optional().nullable(),
  fileType: z.string().min(1, 'File type is required'),
  mimeType: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  category: z.string().optional().nullable(),
  contentText: z.string().optional().nullable(),
  isConfidential: z.boolean().optional().default(false),
  accessLevel: z.enum(['standard', 'restricted', 'confidential']).optional().default('standard'),
  metadata: z.record(z.any()).optional().default({}),
});

/**
 * GET /api/documents
 * List documents with filtering and pagination
 * 
 * Query params:
 * - tenantId: string (required)
 * - folderId: string
 * - category: string
 * - tags: string[] (comma-separated)
 * - fileType: string
 * - uploadedBy: string
 * - searchQuery: string
 * - page: number
 * - limit: number
 * - sortBy: string (name, uploadedAt, createdAt)
 * - sortOrder: string (asc, desc)
 * - statistics: boolean - returns statistics instead of list
 * - search: boolean - uses advanced search
 */
export const GET = async (request: NextRequest) => {
  return withEnhancedRoleAuth(10, async (request, context) => {
    const user = { id: context.userId, organizationId: context.organizationId };

  try {
        const { searchParams } = new URL(request.url);
        
        const tenantId = searchParams.get("tenantId");
        if (!tenantId) {
          logApiAuditEvent({
            timestamp: new Date().toISOString(),
            userId: user.id,
            endpoint: '/api/documents',
            method: 'GET',
            eventType: 'validation_failed',
            severity: 'low',
            details: { reason: 'tenantId is required' },
          });
          return NextResponse.json({ error: "tenantId is required" }, { status: 400 });
        }

        // Check for special modes
        const statistics = searchParams.get("statistics") === "true";
        const search = searchParams.get("search") === "true";

        // Return statistics
        if (statistics) {
          const stats = await getDocumentStatistics(tenantId);
          logApiAuditEvent({
            timestamp: new Date().toISOString(),
            userId: user.id,
            endpoint: '/api/documents',
            method: 'GET',
            eventType: 'success',
            severity: 'low',
            details: { tenantId, mode: 'statistics' },
          });
          return NextResponse.json(stats);
        }

        // Advanced search mode
        if (search) {
          const searchQuery = searchParams.get("searchQuery") || "";
          const filters: any = {};

          const category = searchParams.get("category");
          if (category) filters.category = category;

          const fileType = searchParams.get("fileType");
          if (fileType) filters.fileType = fileType;

          const uploadedBy = searchParams.get("uploadedBy");
          if (uploadedBy) filters.uploadedBy = uploadedBy;

          const tags = searchParams.get("tags");
          if (tags) filters.tags = tags.split(",");

          const page = parseInt(searchParams.get("page") || "1");
          const limit = parseInt(searchParams.get("limit") || "50");

          const results = await searchDocuments(tenantId, searchQuery, filters, { page, limit });
          logApiAuditEvent({
            timestamp: new Date().toISOString(),
            userId: user.id,
            endpoint: '/api/documents',
            method: 'GET',
            eventType: 'success',
            severity: 'low',
            details: { tenantId, mode: 'search', searchQuery, resultCount: results.documents?.length || 0 },
          });
          return NextResponse.json(results);
        }

        // Build filters
        const filters: any = { tenantId };
        
        const folderId = searchParams.get("folderId");
        if (folderId) filters.folderId = folderId;

        const category = searchParams.get("category");
        if (category) filters.category = category;

        const tags = searchParams.get("tags");
        if (tags) filters.tags = tags.split(",");

        const fileType = searchParams.get("fileType");
        if (fileType) filters.fileType = fileType;

        const uploadedBy = searchParams.get("uploadedBy");
        if (uploadedBy) filters.uploadedBy = uploadedBy;

        const searchQuery = searchParams.get("searchQuery");
        if (searchQuery) filters.searchQuery = searchQuery;

        // Pagination
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "50");
        const sortBy = searchParams.get("sortBy") || "uploadedAt";
        const sortOrder = (searchParams.get("sortOrder") || "desc") as "asc" | "desc";

        const result = await listDocuments(filters, { page, limit, sortBy, sortOrder });
        
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId: user.id,
          endpoint: '/api/documents',
          method: 'GET',
          eventType: 'success',
          severity: 'low',
          details: { tenantId, filters, resultCount: result.documents?.length || 0 },
        });

        return NextResponse.json(result);
      } catch (error) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId: user.id,
          endpoint: '/api/documents',
          method: 'GET',
          eventType: 'server_error',
          severity: 'high',
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
        });
        console.error("Error listing documents:", error);
        return NextResponse.json(
          { error: "Failed to list documents", details: error instanceof Error ? error.message : "Unknown error" },
          { status: 500 }
        );
      }
  })(request);
};

/**
 * POST /api/documents
 * Create a new document
 * 
 * Body:
 * - tenantId: string (required)
 * - folderId: string (optional)
 * - name: string (required)
 * - fileUrl: string (required)
 * - fileSize: number
 * - fileType: string (required)
 * - mimeType: string
 * - description: string
 * - tags: string[]
 * - category: string
 * - isConfidential: boolean
 * - accessLevel: string
 * - metadata: object
 */
export const POST = withEnhancedRoleAuth(20, async (request, context) => {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
  }

  const parsed = createDocumentSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const body = parsed.data;
  const user = { id: context.userId, organizationId: context.organizationId };

  const orgId = (body as Record<string, unknown>)["organizationId"] ?? (body as Record<string, unknown>)["orgId"] ?? (body as Record<string, unknown>)["organization_id"] ?? (body as Record<string, unknown>)["org_id"] ?? (body as Record<string, unknown>)["tenantId"] ?? (body as Record<string, unknown>)["tenant_id"] ?? (body as Record<string, unknown>)["unionId"] ?? (body as Record<string, unknown>)["union_id"] ?? (body as Record<string, unknown>)["localId"] ?? (body as Record<string, unknown>)["local_id"];
  if (typeof orgId === 'string' && orgId.length > 0 && orgId !== context.organizationId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

try {
      // Create document
      const document = await createDocument({
        tenantId: body.tenantId,
        folderId: body.folderId || null,
        name: body.name,
        fileUrl: body.fileUrl,
        fileSize: body.fileSize || null,
        fileType: body.fileType,
        mimeType: body.mimeType || null,
        description: body.description || null,
        tags: body.tags || null,
        category: body.category || null,
        contentText: body.contentText || null,
        isConfidential: body.isConfidential,
        accessLevel: body.accessLevel,
        uploadedBy: user.id,
        metadata: body.metadata,
      });

      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId: user.id,
        endpoint: '/api/documents',
        method: 'POST',
        eventType: 'success',
        severity: 'medium',
        details: { tenantId: body.tenantId, documentName: body.name, fileType: body.fileType },
      });

      return NextResponse.json(document, { status: 201 });
    } catch (error) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId: user.id,
        endpoint: '/api/documents',
        method: 'POST',
        eventType: 'server_error',
        severity: 'high',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      });
      console.error("Error creating document:", error);
      return NextResponse.json(
        { error: "Failed to create document", details: error instanceof Error ? error.message : "Unknown error" },
        { status: 500 }
      );
    }
});
