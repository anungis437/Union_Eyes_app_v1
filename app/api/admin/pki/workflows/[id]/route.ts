import { logApiAuditEvent } from "@/lib/middleware/api-security";

// =====================================================================================
// PKI Workflow Details API - Status, Advance, Cancel
// =====================================================================================
// GET /api/admin/pki/workflows/[id] - Get workflow status
// PUT /api/admin/pki/workflows/[id] - Advance workflow manually (admin)
// DELETE /api/admin/pki/workflows/[id] - Cancel workflow
// =====================================================================================

import { NextRequest, NextResponse } from 'next/server';
import { 
  getWorkflow,
  getWorkflowStatus,
  advanceWorkflow,
  cancelWorkflow,
} from '@/services/pki/workflow-engine';
import { z } from "zod";
import { withAdminAuth } from '@/lib/api-auth-guard';

export const GET = async (request: NextRequest, { params }: { params: { id: string } }) => {
  return withAdminAuth(async (request, context) => {
  try {
      const workflowId = params.id;
      const { searchParams } = new URL(request.url);
      const detailLevel = searchParams.get('detail') || 'status';

      if (detailLevel === 'full') {
        // Get full workflow details
        const workflow = getWorkflow(workflowId);
        
        if (!workflow) {
          return NextResponse.json(
            { error: 'Workflow not found' },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          workflow,
        });
      } else {
        // Get workflow status summary (default)
        const status = getWorkflowStatus(workflowId);

        return NextResponse.json({
          success: true,
          status,
        });
      }

    } catch (error) {
      console.error('Error fetching workflow:', error);
      return NextResponse.json(
        { error: 'Failed to fetch workflow', details: (error as Error).message },
        { status: 500 }
      );
    }
    })(request, { params });
};

export const PUT = async (request: NextRequest, { params }: { params: { id: string } }) => {
  return withAdminAuth(async (request, context) => {
  try {
      const workflowId = params.id;

      const result = advanceWorkflow(workflowId);

      return NextResponse.json({
        success: true,
        result,
        message: result.isComplete 
          ? 'Workflow completed' 
          : `Advanced to step ${result.currentStep} of ${result.totalSteps}`,
      });

    } catch (error) {
      console.error('Error advancing workflow:', error);
      return NextResponse.json(
        { error: 'Failed to advance workflow', details: (error as Error).message },
        { status: 500 }
      );
    }
    })(request, { params });
};

export const DELETE = async (request: NextRequest, { params }: { params: { id: string } }) => {
  return withAdminAuth(async (request, context) => {
    const { userId } = context;

  try {
      const workflowId = params.id;
      const body = await request.json();
      const { reason } = body;

      if (!reason) {
        return NextResponse.json(
          { error: 'Cancellation reason required' },
          { status: 400 }
        );
      }

      cancelWorkflow(workflowId, userId, reason);

      return NextResponse.json({
        success: true,
        message: 'Workflow cancelled successfully',
      });

    } catch (error) {
      console.error('Error cancelling workflow:', error);
      return NextResponse.json(
        { error: 'Failed to cancel workflow', details: (error as Error).message },
        { status: 500 }
      );
    }
    })(request, { params });
};
