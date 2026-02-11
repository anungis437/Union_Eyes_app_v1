/**
 * Signature Request API
 * POST /api/signatures/documents - Create signature request
 * GET /api/signatures/documents - Get user's documents
 */

import { NextRequest, NextResponse } from "next/server";
import { withApiAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { SignatureService } from "@/lib/signature/signature-service";

/**
 * Create signature request
 */
export const POST = withApiAuth(async (request: NextRequest) => {
  try {
    const user = await getCurrentUser();
    if (!user || !user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const userId = user.id;
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const documentType = formData.get("documentType") as string;
    const organizationId = (formData.get("organizationId") ?? formData.get("tenantId")) as string;
    const signersJson = formData.get("signers") as string;
    const provider = formData.get("provider") as any;
    const expirationDays = formData.get("expirationDays") as string;
    const requireAuthentication = formData.get("requireAuthentication") as string;
    const sequentialSigning = formData.get("sequentialSigning") as string;

    if (!file || !title || !organizationId || !signersJson) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const signers = JSON.parse(signersJson);

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Create signature request
    const document = await SignatureService.createSignatureRequest({
      tenantId: organizationId,
      title,
      description,
      documentType: documentType || "contract",
      file: buffer,
      fileName: file.name,
      sentBy: userId,
      signers,
      provider: provider || undefined,
      expirationDays: expirationDays ? parseInt(expirationDays) : undefined,
      requireAuthentication: requireAuthentication === "true",
      sequentialSigning: sequentialSigning === "true",
    });

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        title: document.title,
        status: document.status,
        createdAt: document.createdAt,
      },
    });
  } catch (error) {
return NextResponse.json(
      { error: "Failed to create signature request" },
      { status: 500 }
    );
  }
});

/**
 * Get user's documents
 */
export const GET = withApiAuth(async (request: NextRequest) => {
  try {
    const user = await getCurrentUser();
    if (!user || !user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const userId = user.id;
    const { searchParams } = new URL(request.url);
    const organizationId = (searchParams.get("organizationId") ?? searchParams.get("tenantId"));

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID required" },
        { status: 400 }
      );
    }

    const documents = await SignatureService.getUserDocuments( userId,
      organizationId
    );

    return NextResponse.json(documents);
  } catch (error) {
return NextResponse.json(
      { error: "Failed to retrieve documents" },
      { status: 500 }
    );
  }
});

