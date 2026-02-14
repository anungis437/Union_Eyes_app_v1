import { logApiAuditEvent } from "@/lib/middleware/api-security";

// =====================================================================================
// PKI Verify Signature API
// =====================================================================================
// POST /api/admin/pki/signatures/[id]/verify - Verify a signature
// =====================================================================================

import { NextRequest, NextResponse } from 'next/server';
import { verifySignature, verifyDocumentIntegrity } from '@/services/pki/verification-service';
import { z } from "zod";
import { withApiAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';


const adminPkiSignaturesVerifySchema = z.object({
  verifyType: z.unknown().optional(),
  documentContent: z.unknown().optional(),
});

export const POST = async (request: NextRequest, { params }: { params: { id: string } }) => {
  return withRoleAuth(90, async (request, context) => {
  try {
      const signatureOrDocumentId = params.id;
      const body = await request.json();
    // Validate request body
    const validation = adminPkiSignaturesVerifySchema.safeParse(body);
    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request data',
        validation.error.errors
      );
    }
    
    const { verifyType, documentContent } = validation.data;
      const { verifyType, documentContent } = body;

      // Determine verification type
      if (verifyType === 'document') {
        // Verify entire document integrity
        const result = await verifyDocumentIntegrity(
          signatureOrDocumentId,
          documentContent ? Buffer.from(documentContent, 'base64') : undefined
        );

        return NextResponse.json({
          success: true,
          verification: result,
        });
      } else {
        // Verify single signature (default)
        const result = await verifySignature(
          signatureOrDocumentId,
          documentContent ? Buffer.from(documentContent, 'base64') : undefined
        );

        return NextResponse.json({
          success: true,
          verification: result,
        });
      }

    } catch (error) {
return NextResponse.json(
        { error: 'Failed to verify signature', details: (error as Error).message },
        { status: 500 }
      );
    }
    })(request, { params });
};
