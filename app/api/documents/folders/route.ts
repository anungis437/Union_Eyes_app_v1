/**
 * Document Folders API Routes
 * GET /api/documents/folders - List folders
 * POST /api/documents/folders - Create folder
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { 
  listFolders, 
  createFolder,
  getFolderTree
} from "@/lib/services/document-service";

/**
 * GET /api/documents/folders
 * List folders or get folder tree
 * 
 * Query params:
 * - tenantId: string (required)
 * - parentFolderId: string (optional, use "root" for root folders)
 * - tree: boolean - return full folder tree structure
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    
    const tenantId = searchParams.get("tenantId");
    if (!tenantId) {
      return NextResponse.json({ error: "tenantId is required" }, { status: 400 });
    }

    const tree = searchParams.get("tree") === "true";

    if (tree) {
      const folderTree = await getFolderTree(tenantId);
      return NextResponse.json({ folders: folderTree });
    }

    const parentFolderId = searchParams.get("parentFolderId");
    const folders = await listFolders(
      tenantId, 
      parentFolderId === "root" ? null : parentFolderId || undefined
    );
    
    return NextResponse.json({ folders });
  } catch (error) {
    console.error("Error listing folders:", error);
    return NextResponse.json(
      { error: "Failed to list folders", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

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
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    
    if (!body.tenantId) {
      return NextResponse.json({ error: "tenantId is required" }, { status: 400 });
    }

    if (!body.name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const folder = await createFolder({
      tenantId: body.tenantId,
      name: body.name,
      description: body.description || null,
      parentFolderId: body.parentFolderId || null,
      createdBy: userId,
    });

    return NextResponse.json(folder, { status: 201 });
  } catch (error) {
    console.error("Error creating folder:", error);
    return NextResponse.json(
      { error: "Failed to create folder", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
