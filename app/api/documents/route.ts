/**
 * Documents API Routes - Main endpoints for document management
 * GET /api/documents - List documents with filtering and pagination
 * POST /api/documents - Upload/create a new document
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { 
  listDocuments, 
  createDocument, 
  searchDocuments,
  getDocumentStatistics 
} from "@/lib/services/document-service";

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

    // Check for special modes
    const statistics = searchParams.get("statistics") === "true";
    const search = searchParams.get("search") === "true";

    // Return statistics
    if (statistics) {
      const stats = await getDocumentStatistics(tenantId);
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
      return NextResponse.json(results);
    }

    // Build filters
    const filters: any = { tenantId };
    
    const folderId = searchParams.get("folderId");
    if (folderId) {
      filters.folderId = folderId;
    }

    const category = searchParams.get("category");
    if (category) {
      filters.category = category;
    }

    const tags = searchParams.get("tags");
    if (tags) {
      filters.tags = tags.split(",");
    }

    const fileType = searchParams.get("fileType");
    if (fileType) {
      filters.fileType = fileType;
    }

    const uploadedBy = searchParams.get("uploadedBy");
    if (uploadedBy) {
      filters.uploadedBy = uploadedBy;
    }

    const searchQuery = searchParams.get("searchQuery");
    if (searchQuery) {
      filters.searchQuery = searchQuery;
    }

    // Pagination
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const sortBy = searchParams.get("sortBy") || "uploadedAt";
    const sortOrder = (searchParams.get("sortOrder") || "desc") as "asc" | "desc";

    const result = await listDocuments(filters, { page, limit, sortBy, sortOrder });
    
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error listing documents:", error);
    return NextResponse.json(
      { error: "Failed to list documents", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

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
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate required fields
    if (!body.tenantId) {
      return NextResponse.json({ error: "tenantId is required" }, { status: 400 });
    }

    if (!body.name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    if (!body.fileUrl) {
      return NextResponse.json({ error: "fileUrl is required" }, { status: 400 });
    }

    if (!body.fileType) {
      return NextResponse.json({ error: "fileType is required" }, { status: 400 });
    }

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
      isConfidential: body.isConfidential || false,
      accessLevel: body.accessLevel || "standard",
      uploadedBy: userId,
      metadata: body.metadata || {},
    });

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error("Error creating document:", error);
    return NextResponse.json(
      { error: "Failed to create document", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
