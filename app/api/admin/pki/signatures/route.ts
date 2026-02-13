import { logApiAuditEvent } from "@/lib/middleware/api-security";

// =====================================================================================
// PKI Signatures API - List & Create
// =====================================================================================
// GET /api/admin/pki/signatures - List signatures
// POST /api/admin/pki/signatures - Create signature request/workflow
// =====================================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getDocumentSignatures } from '@/services/pki/signature-service';
import { createWorkflow, startWorkflow } from '@/services/pki/workflow-engine';
import type { WorkflowCreateParams } from '@/services/pki/workflow-engine';
import { z } from "zod";
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';
import { clerkClient } from '@clerk/nextjs/server';

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
export const GET = async (request: NextRequest) => {
  return withEnhancedRoleAuth(90, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      const { searchParams } = new URL(request.url);
      const documentId = searchParams.get('documentId');

      if (!documentId) {
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Document ID required'
    );
      }

      const signatures = await getDocumentSignatures(documentId, organizationId ?? undefined);

      return NextResponse.json({
        success: true,
        signatures,
        count: signatures.length,
      });

    } catch (error) {
return NextResponse.json(
        { error: 'Failed to fetch signatures', details: (error as Error).message },
        { status: 500 }
      );
    }
    })(request);
};


const adminPkiSignaturesSchema = z.object({
  documentId: z.string().uuid('Invalid documentId'),
  documentType: z.unknown().optional(),
  name: z.string().min(1, 'name is required'),
  description: z.string().optional(),
  workflowType: z.unknown().optional(),
  steps: z.unknown().optional(),
  dueDate: z.string().datetime().optional(),
  expiresAt: z.unknown().optional(),
  autoStart: z.unknown().optional(),
});

export const POST = async (request: NextRequest) => {
  return withEnhancedRoleAuth(90, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      if (!userId || !organizationId) {
        return standardErrorResponse(
      ErrorCode.AUTH_REQUIRED,
      'Unauthorized - Organization context required'
    );
      }

      const body = await request.json();
    // Validate request body
    const validation = adminPkiSignaturesSchema.safeParse(body);
    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request data',
        validation.error.errors
      );
    }
    
    const { documentId, documentType, name, description, workflowType, steps, dueDate, expiresAt, autoStart } = validation.data;
    // DUPLICATE REMOVED (Phase 2): Multi-line destructuring of body
    // const {
    // documentId,
    // documentType,
    // name,
    // description,
    // workflowType,
    // steps,
    // dueDate,
    // expiresAt,
    // autoStart,
    // } = body;

      // Validation
      if (!documentId || !documentType || !name || !workflowType || !steps) {
        return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Missing required fields: documentId, documentType, name, workflowType, steps'
      // TODO: Migrate additional details: documentType, name, workflowType, steps'
    );
      }

      const user = await clerkClient.users.getUser(userId);
      const createdByName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User';

      // Create workflow
      const workflowParams: WorkflowCreateParams = {
        documentId,
        documentType,
        organizationId: organizationId,
        createdBy: userId,
        createdByName,
        name,
        description,
        workflowType,
        steps,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      };

      const workflow = createWorkflow(workflowParams);

      // Auto-start if requested
      if (autoStart) {
        startWorkflow(workflow.id);
      }

      return NextResponse.json({
        success: true,
        workflow,
        message: 'Signature workflow created successfully',
      });

    } catch (error) {
return NextResponse.json(
        { error: 'Failed to create signature workflow', details: (error as Error).message },
        { status: 500 }
      );
    }
    })(request);
};
