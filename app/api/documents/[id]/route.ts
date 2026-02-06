/**
 * Document Detail API Routes
 * GET /api/documents/[id] - Get document by ID
 * PATCH /api/documents/[id] - Update document
 * DELETE /api/documents/[id] - Delete document
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { 
  getDocumentById, 
  updateDocument, 
  deleteDocument,
  permanentlyDeleteDocument,
  getDocumentVersions
} from "@/lib/services/document-service";

/**
 * GET /api/documents/[id]
 * Get document by ID
 * 
 * Query params:
 * - includeFolder: boolean
 * - versions: boolean - include version history
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeFolder = searchParams.get("includeFolder") === "true";
    const versions = searchParams.get("versions") === "true";

    const document = await getDocumentById(params.id, includeFolder);
    
    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    if (versions) {
      const versionHistory = await getDocumentVersions(params.id);
      return NextResponse.json({ ...document, versions: versionHistory });
    }

    return NextResponse.json(document);
  } catch (error) {
    console.error("Error fetching document:", error);
    return NextResponse.json(
      { error: "Failed to fetch document", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/documents/[id]
 * Update document
 * 
 * Body: Partial document fields to update
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Remove fields that shouldn't be updated directly
    delete body.id;
    delete body.uploadedBy;
    delete body.uploadedAt;
    delete body.createdAt;

    const updated = await updateDocument(params.id, body);
    
    if (!updated) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating document:", error);
    return NextResponse.json(
      { error: "Failed to update document", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/documents/[id]
 * Delete document (soft delete by default)
 * 
 * Query params:
 * - permanent: boolean - permanently delete (hard delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const permanent = searchParams.get("permanent") === "true";

    const success = permanent
      ? await permanentlyDeleteDocument(params.id)
      : await deleteDocument(params.id);

    if (!success) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Document deleted successfully" });
  } catch (error) {
    console.error("Error deleting document:", error);
    return NextResponse.json(
      { error: "Failed to delete document", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
