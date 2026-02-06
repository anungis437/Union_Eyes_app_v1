/**
 * Signature Request API
 * POST /api/signatures/documents - Create signature request
 * GET /api/signatures/documents - Get user's documents
 */

import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { SignatureService } from "@/lib/signature/signature-service";

/**
 * Create signature request
 */
export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const documentType = formData.get("documentType") as string;
    const tenantId = formData.get("tenantId") as string;
    const signersJson = formData.get("signers") as string;
    const provider = formData.get("provider") as any;
    const expirationDays = formData.get("expirationDays") as string;
    const requireAuthentication = formData.get("requireAuthentication") as string;
    const sequentialSigning = formData.get("sequentialSigning") as string;

    if (!file || !title || !tenantId || !signersJson) {
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
      tenantId,
      title,
      description,
      documentType: documentType || "contract",
      file: buffer,
      fileName: file.name,
      sentBy: user.id,
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
    console.error("Signature request error:", error);
    return NextResponse.json(
      { error: "Failed to create signature request" },
      { status: 500 }
    );
  }
}

/**
 * Get user's documents
 */
export async function GET(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get("tenantId");

    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant ID required" },
        { status: 400 }
      );
    }

    const documents = await SignatureService.getUserDocuments(
      user.id,
      tenantId
    );

    return NextResponse.json(documents);
  } catch (error) {
    console.error("Get documents error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve documents" },
      { status: 500 }
    );
  }
}
