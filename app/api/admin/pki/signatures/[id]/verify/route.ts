// =====================================================================================
// PKI Verify Signature API
// =====================================================================================
// POST /api/admin/pki/signatures/[id]/verify - Verify a signature
// =====================================================================================

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { verifySignature, verifyDocumentIntegrity } from '@/services/pki/verification-service';

/**
 * POST /api/admin/pki/signatures/[id]/verify
 * Verify a signature or entire document
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const signatureOrDocumentId = params.id;
    const body = await request.json();
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
    console.error('Error verifying signature:', error);
    return NextResponse.json(
      { error: 'Failed to verify signature', details: (error as Error).message },
      { status: 500 }
    );
  }
}
