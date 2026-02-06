/**
 * Document Status API
 * GET /api/signatures/documents/[id] - Get document details
 * PATCH /api/signatures/documents/[id] - Update document (void, etc.)
 */

import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { SignatureService, AuditTrailService } from "@/lib/signature/signature-service";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const documentId = params.id;
    const document = await SignatureService.getDocumentStatus(documentId);

    // TODO: Check if user has access to this document

    return NextResponse.json(document);
  } catch (error) {
    console.error("Get document error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve document" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const documentId = params.id;
    const body = await req.json();
    const { action, reason } = body;

    if (action === "void") {
      if (!reason) {
        return NextResponse.json(
          { error: "Void reason required" },
          { status: 400 }
        );
      }

      await SignatureService.voidDocument(documentId, user.id, reason);

      return NextResponse.json({
        success: true,
        message: "Document voided successfully",
      });
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Update document error:", error);
    return NextResponse.json(
      { error: "Failed to update document" },
      { status: 500 }
    );
  }
}
