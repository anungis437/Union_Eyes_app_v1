/**
 * Document OCR Processing API Route
 * POST /api/documents/[id]/ocr - Process document with OCR
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { processDocumentOCR } from "@/lib/services/document-service";

/**
 * POST /api/documents/[id]/ocr
 * Process document with OCR to extract text content
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await processDocumentOCR(params.id);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error processing document OCR:", error);
    return NextResponse.json(
      { error: "Failed to process document OCR", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
