import { logApiAuditEvent } from "@/lib/middleware/api-security";

// =====================================================================================
// PKI Sign Document API
// =====================================================================================
// POST /api/admin/pki/signatures/[id]/sign - Sign a document
// =====================================================================================

import { NextRequest, NextResponse } from 'next/server';
import { signDocument } from '@/services/pki/signature-service';
import { recordSignature } from '@/services/pki/workflow-engine';
import type { SignDocumentParams } from '@/services/pki/signature-service';
import { z } from "zod";
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";

export const POST = async (request: NextRequest, { params }: { params: { id: string } }) => {
  return withEnhancedRoleAuth(90, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      if (!userId || !organizationId) {
        return NextResponse.json(
          { error: 'Unauthorized - Organization context required' },
          { status: 401 }
        );
      }

      const documentId = params.id;
      const body = await request.json();
      const {
        documentType,
        documentUrl,
        userName,
        userTitle,
        userEmail,
        workflowId,
      } = body;

      if (!documentType || !userName) {
        return NextResponse.json(
          { error: 'Missing required fields: documentType, userName' },
          { status: 400 }
        );
      }

      // Get client info for audit trail
      const ipAddress = request.headers.get('x-forwarded-for') || 
                        request.headers.get('x-real-ip') || 
                        'unknown';
      const userAgent = request.headers.get('user-agent') || 'unknown';

      // Sign document
      const signParams: SignDocumentParams = {
        documentId,
        documentType,
        documentUrl,
        userId,
        userName,
        userTitle,
        userEmail,
        organizationId: organizationId,
        ipAddress,
        userAgent,
      };

      const signature = await signDocument(signParams);

      // If part of workflow, record signature
      let workflowResult;
      if (workflowId) {
        try {
          workflowResult = await recordSignature(workflowId, userId, signature.signatureId);
        } catch (error) {
          console.error('Error recording signature in workflow:', error);
          // Continue even if workflow update fails
        }
      }

      return NextResponse.json({
        success: true,
        signature,
        workflow: workflowResult,
        message: 'Document signed successfully',
      });

    } catch (error) {
      console.error('Error signing document:', error);
      return NextResponse.json(
        { error: 'Failed to sign document', details: (error as Error).message },
        { status: 500 }
      );
    }
    })(request, { params });
};
