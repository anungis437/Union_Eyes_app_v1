/**
 * Document Folders API Routes
 * GET /api/documents/folders - List folders
 * POST /api/documents/folders - Create folder
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { 
  listFolders, 
  createFolder,
  getFolderTree
} from "@/lib/services/document-service";
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';

/**
 * Validation schema for creating folders
 */
const createFolderSchema = z.object({
  tenantId: z.string().uuid('Invalid tenant ID'),
  name: z.string().min(1, 'Folder name is required'),
  description: z.string().optional().nullable(),
  parentFolderId: z.string().uuid().optional().nullable(),
});

/**
 * GET /api/documents/folders
 * List folders or get folder tree
 * 
 * Query params:
 * - tenantId: string (required)
 * - parentFolderId: string (optional, use "root" for root folders)
 * - tree: boolean - return full folder tree structure
 */
export const GET = async (request: NextRequest) => {
  return withRoleAuth(10, async (request, context) => {
    const { userId, organizationId } = context;

  try {
        const { searchParams } = new URL(request.url);
        
        const organizationId = (searchParams.get("organizationId") ?? searchParams.get("tenantId"));
        
        const tenantId = organizationId;
        if (!tenantId) {
          logApiAuditEvent({
            timestamp: new Date().toISOString(), userId,
            endpoint: '/api/documents/folders',
            method: 'GET',
            eventType: 'validation_failed',
            severity: 'low',
            details: { reason: 'Missing tenantId parameter' },
          });
          return NextResponse.json({ error: "tenantId is required" }, { status: 400 });
        }

        const tree = searchParams.get("tree") === "true";

        if (tree) {
          const folderTree = await getFolderTree(tenantId);
          logApiAuditEvent({
            timestamp: new Date().toISOString(), userId,
            endpoint: '/api/documents/folders',
            method: 'GET',
            eventType: 'success',
            severity: 'low',
            details: { tenantId, mode: 'tree', treeSize: JSON.stringify(folderTree || []).length },
          });
          return NextResponse.json({ folders: folderTree });
        }

        const parentFolderId = searchParams.get("parentFolderId");
        const folders = await listFolders(
          tenantId, 
          parentFolderId === "root" ? null : parentFolderId || undefined
        );
        
        logApiAuditEvent({
          timestamp: new Date().toISOString(), userId,
          endpoint: '/api/documents/folders',
          method: 'GET',
          eventType: 'success',
          severity: 'low',
          details: { tenantId, mode: 'list', folderCount: folders?.length || 0, hasParentFilter: !!parentFolderId },
        });

        return NextResponse.json({ folders });
      } catch (error) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(), userId,
          endpoint: '/api/documents/folders',
          method: 'GET',
          eventType: 'server_error',
          severity: 'high',
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
        });
return NextResponse.json(
          { error: "Failed to list folders", details: error instanceof Error ? error.message : "Unknown error" },
          { status: 500 }
        );
      }
      })(request);
};

/**
 * POST /api/documents/folders
 * Create a new folder
 * 
 * Body:
 * - tenantId: string (required)
 * - name: string (required)
 * - description: string
 * - parentFolderId: string
 */
export const POST = withRoleAuth(20, async (request, context) => {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
  }

  const parsed = createFolderSchema.safeParse(rawBody);
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
      const folder = await createFolder({
        tenantId: body.tenantId,
        name: body.name,
        description: body.description || null,
        parentFolderId: body.parentFolderId || null,
        createdBy: userId,
      });

      logApiAuditEvent({
        timestamp: new Date().toISOString(), userId,
        endpoint: '/api/documents/folders',
        method: 'POST',
        eventType: 'success',
        severity: 'medium',
        details: { 
          folderName: body.name,
          tenantId: body.tenantId,
          hasParent: !!body.parentFolderId,
        },
      });

      return NextResponse.json(folder, { status: 201 });
    } catch (error) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(), userId,
        endpoint: '/api/documents/folders',
        method: 'POST',
        eventType: 'server_error',
        severity: 'high',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      });
return NextResponse.json(
        { error: "Failed to create folder", details: error instanceof Error ? error.message : "Unknown error" },
        { status: 500 }
      );
    }
});


