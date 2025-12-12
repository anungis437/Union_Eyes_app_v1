// =====================================================================================
// PKI Workflow Details API - Status, Advance, Cancel
// =====================================================================================
// GET /api/admin/pki/workflows/[id] - Get workflow status
// PUT /api/admin/pki/workflows/[id] - Advance workflow manually (admin)
// DELETE /api/admin/pki/workflows/[id] - Cancel workflow
// =====================================================================================

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { 
  getWorkflow,
  getWorkflowStatus,
  advanceWorkflow,
  cancelWorkflow,
} from '@/services/pki/workflow-engine';

/**
 * GET /api/admin/pki/workflows/[id]
 * Get workflow status and details
 */
export async function GET(
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
}

/**
 * PUT /api/admin/pki/workflows/[id]
 * Advance workflow manually (admin override)
 */
export async function PUT(
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

    const workflowId = params.id;

    // TODO: Add admin role check
    // For now, allow any authenticated user to advance workflow

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
}

/**
 * DELETE /api/admin/pki/workflows/[id]
 * Cancel workflow
 */
export async function DELETE(
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
}
