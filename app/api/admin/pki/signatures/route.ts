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

export const GET = async (request: NextRequest) => {
  return withEnhancedRoleAuth(90, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      const { searchParams } = new URL(request.url);
      const documentId = searchParams.get('documentId');

      if (!documentId) {
        return NextResponse.json(
          { error: 'Document ID required' },
          { status: 400 }
        );
      }

      const signatures = await getDocumentSignatures(documentId, organizationId ?? undefined);

      return NextResponse.json({
        success: true,
        signatures,
        count: signatures.length,
      });

    } catch (error) {
      console.error('Error fetching signatures:', error);
      return NextResponse.json(
        { error: 'Failed to fetch signatures', details: (error as Error).message },
        { status: 500 }
      );
    }
    })(request);
};

export const POST = async (request: NextRequest) => {
  return withEnhancedRoleAuth(90, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      if (!userId || !organizationId) {
        return NextResponse.json(
          { error: 'Unauthorized - Organization context required' },
          { status: 401 }
        );
      }

      const body = await request.json();
      const {
        documentId,
        documentType,
        name,
        description,
        workflowType,
        steps,
        dueDate,
        expiresAt,
        autoStart,
      } = body;

      // Validation
      if (!documentId || !documentType || !name || !workflowType || !steps) {
        return NextResponse.json(
          { error: 'Missing required fields: documentId, documentType, name, workflowType, steps' },
          { status: 400 }
        );
      }

      // TODO: Get user name from Clerk user metadata
      const createdByName = 'Current User'; // Placeholder

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
      console.error('Error creating signature workflow:', error);
      return NextResponse.json(
        { error: 'Failed to create signature workflow', details: (error as Error).message },
        { status: 500 }
      );
    }
    })(request);
};
