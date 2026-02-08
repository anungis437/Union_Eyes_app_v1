/**
 * Document OCR Processing API Route
 * POST /api/documents/[id]/ocr - Process document with OCR
 */

import { NextRequest, NextResponse } from "next/server";
import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { processDocumentOCR } from "@/lib/services/document-service";
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";

/**
 * POST /api/documents/[id]/ocr
 * Process document with OCR to extract text content
 */
export const POST = async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
    const { userId, organizationId } = context;

  try {
        const result = await processDocumentOCR(params.id);
        
        logApiAuditEvent({
          timestamp: new Date().toISOString(), userId,
          endpoint: `/api/documents/${params.id}/ocr`,
          method: 'POST',
          eventType: 'success',
          severity: 'medium',
          details: { documentId: params.id },
        });

        return NextResponse.json(result);
      } catch (error) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(), userId,
          endpoint: `/api/documents/${params.id}/ocr`,
          method: 'POST',
          eventType: 'server_error',
          severity: 'high',
          details: { documentId: params.id, error: error instanceof Error ? error.message : 'Unknown error' },
        });
        console.error("Error processing document OCR:", error);
        return NextResponse.json(
          { error: "Failed to process document OCR", details: error instanceof Error ? error.message : "Unknown error" },
          { status: 500 }
        );
      }
      })(request, { params });
};
