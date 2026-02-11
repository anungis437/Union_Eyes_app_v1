/**
 * Document Status API
 * GET /api/signatures/documents/[id] - Get document details
 * PATCH /api/signatures/documents/[id] - Update document (void, etc.)
 */

import { NextRequest, NextResponse } from "next/server";
import { withApiAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { SignatureService, AuditTrailService } from "@/lib/signature/signature-service";

export const GET = withApiAuth(async (
  req: NextRequest,
  { params }: { params: { id: string } }
) => {
  try {
    const user = await getCurrentUser();
    if (!user || !user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const documentId = params.id;
    
    // SECURITY FIX: Verify user has access to this document (prevent IDOR)
    const hasAccess = await SignatureService.verifyDocumentAccess(documentId, user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const document = await SignatureService.getDocumentStatus(documentId);

    return NextResponse.json(document);
  } catch (error) {
return NextResponse.json(
      { error: "Failed to retrieve document" },
      { status: 500 }
    );
  }
});

export const PATCH = withApiAuth(async (
  req: NextRequest,
  { params }: { params: { id: string } }
) => {
  try {
    const user = await getCurrentUser();
    if (!user || !user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const userId = user.id;
    const documentId = params.id;
    
    // SECURITY FIX: Verify user has access to this document (prevent IDOR)
    const hasAccess = await SignatureService.verifyDocumentAccess(documentId, userId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    
    const body = await req.json();
    const { action, reason } = body;

    if (action === "void") {
      if (!reason) {
        return NextResponse.json(
          { error: "Void reason required" },
          { status: 400 }
        );
      }

      await SignatureService.voidDocument(documentId, userId, reason);

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
return NextResponse.json(
      { error: "Failed to update document" },
      { status: 500 }
    );
  }
});
