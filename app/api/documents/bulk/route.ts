/**
 * Document Bulk Operations API Route
 * POST /api/documents/bulk - Perform bulk operations on documents
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { 
  bulkMoveDocuments,
  bulkUpdateTags,
  bulkDeleteDocuments,
  bulkProcessOCR
} from "@/lib/services/document-service";
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";

/**
 * Validation schemas for bulk operations
 */
const bulkMoveSchema = z.object({
  operation: z.literal('move'),
  documentIds: z.array(z.string().uuid()).min(1, 'At least one document ID is required'),
  targetFolderId: z.string().uuid().nullable(),
});

const bulkTagSchema = z.object({
  operation: z.literal('tag'),
  documentIds: z.array(z.string().uuid()).min(1, 'At least one document ID is required'),
  tags: z.array(z.string()).min(1, 'At least one tag is required'),
  tagOperation: z.enum(['add', 'remove', 'replace']),
});

const bulkDeleteSchema = z.object({
  operation: z.literal('delete'),
  documentIds: z.array(z.string().uuid()).min(1, 'At least one document ID is required'),
});

const bulkOCRSchema = z.object({
  operation: z.literal('ocr'),
  documentIds: z.array(z.string().uuid()).min(1, 'At least one document ID is required'),
});

const bulkOperationSchema = z.discriminatedUnion('operation', [
  bulkMoveSchema,
  bulkTagSchema,
  bulkDeleteSchema,
  bulkOCRSchema,
]);

/**
 * POST /api/documents/bulk
 * Perform bulk operations on documents
 * 
 * Body:
 * - operation: "move" | "tag" | "delete" | "ocr" (required)
 * - documentIds: string[] (required)
 * - targetFolderId: string (for move operation)
 * - tags: string[] (for tag operation)
 * - tagOperation: "add" | "remove" | "replace" (for tag operation)
 */
export const POST = withEnhancedRoleAuth(20, async (request, context) => {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
  }

  const parsed = bulkOperationSchema.safeParse(rawBody);
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
      let result;

      switch (body.operation) {
        case "move":
          result = await bulkMoveDocuments(body.documentIds, body.targetFolderId);
          logApiAuditEvent({
            timestamp: new Date().toISOString(),
            userId: user.id,
            endpoint: '/api/documents/bulk',
            method: 'POST',
            eventType: 'success',
            severity: 'medium',
            details: { operation: 'move', documentCount: body.documentIds.length, targetFolderId: body.targetFolderId },
          });
          break;

        case "tag":
          result = await bulkUpdateTags(body.documentIds, body.tags, body.tagOperation);
          logApiAuditEvent({
            timestamp: new Date().toISOString(),
            userId: user.id,
            endpoint: '/api/documents/bulk',
            method: 'POST',
            eventType: 'success',
            severity: 'medium',
            details: { operation: 'tag', documentCount: body.documentIds.length, tagCount: body.tags.length, tagOperation: body.tagOperation },
          });
          break;

        case "delete":
          result = await bulkDeleteDocuments(body.documentIds);
          logApiAuditEvent({
            timestamp: new Date().toISOString(),
            userId: user.id,
            endpoint: '/api/documents/bulk',
            method: 'POST',
            eventType: 'success',
            severity: 'high',
            details: { operation: 'delete', documentCount: body.documentIds.length },
          });
          break;

        case "ocr":
          result = await bulkProcessOCR(body.documentIds);
          logApiAuditEvent({
            timestamp: new Date().toISOString(),
            userId: user.id,
            endpoint: '/api/documents/bulk',
            method: 'POST',
            eventType: 'success',
            severity: 'medium',
            details: { operation: 'ocr', documentCount: body.documentIds.length },
          });
          break;
      }

      return NextResponse.json(result);
    } catch (error) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId: user.id,
        endpoint: '/api/documents/bulk',
        method: 'POST',
        eventType: 'server_error',
        severity: 'high',
        details: { operation: body.operation, error: error instanceof Error ? error.message : 'Unknown error' },
      });
      console.error("Error performing bulk operation:", error);
      return NextResponse.json(
        { error: "Failed to perform bulk operation", details: error instanceof Error ? error.message : "Unknown error" },
        { status: 500 }
      );
    }
});
