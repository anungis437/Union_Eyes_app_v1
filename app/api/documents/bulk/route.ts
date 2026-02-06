/**
 * Document Bulk Operations API Route
 * POST /api/documents/bulk - Perform bulk operations on documents
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { 
  bulkMoveDocuments,
  bulkUpdateTags,
  bulkDeleteDocuments,
  bulkProcessOCR
} from "@/lib/services/document-service";

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
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    
    if (!body.operation) {
      return NextResponse.json({ error: "operation is required" }, { status: 400 });
    }

    if (!body.documentIds || !Array.isArray(body.documentIds) || body.documentIds.length === 0) {
      return NextResponse.json({ error: "documentIds array is required" }, { status: 400 });
    }

    let result;

    switch (body.operation) {
      case "move":
        if (body.targetFolderId === undefined) {
          return NextResponse.json({ error: "targetFolderId is required for move operation" }, { status: 400 });
        }
        result = await bulkMoveDocuments(body.documentIds, body.targetFolderId);
        break;

      case "tag":
        if (!body.tags || !Array.isArray(body.tags)) {
          return NextResponse.json({ error: "tags array is required for tag operation" }, { status: 400 });
        }
        if (!body.tagOperation || !["add", "remove", "replace"].includes(body.tagOperation)) {
          return NextResponse.json({ error: "tagOperation must be 'add', 'remove', or 'replace'" }, { status: 400 });
        }
        result = await bulkUpdateTags(body.documentIds, body.tags, body.tagOperation);
        break;

      case "delete":
        result = await bulkDeleteDocuments(body.documentIds);
        break;

      case "ocr":
        result = await bulkProcessOCR(body.documentIds);
        break;

      default:
        return NextResponse.json({ error: "Invalid operation" }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error performing bulk operation:", error);
    return NextResponse.json(
      { error: "Failed to perform bulk operation", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
