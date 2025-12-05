// =====================================================================================
// PKI Workflows API - List & Create
// =====================================================================================
// GET /api/admin/pki/workflows - List workflows
// POST /api/admin/pki/workflows - Create new workflow
// =====================================================================================

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { 
  getUserWorkflows,
  getUserPendingWorkflows,
  getDocumentWorkflows,
} from '@/services/pki/workflow-engine';

/**
 * GET /api/admin/pki/workflows
 * List workflows (filtered by user or document)
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter');
    const documentId = searchParams.get('documentId');

    let workflows;

    if (documentId) {
      // Get workflows for specific document
      workflows = getDocumentWorkflows(documentId);
    } else if (filter === 'pending') {
      // Get user's pending workflows (needs signature)
      workflows = getUserPendingWorkflows(userId);
    } else {
      // Get all user's workflows
      workflows = getUserWorkflows(userId);
    }

    return NextResponse.json({
      success: true,
      workflows,
      count: workflows.length,
    });

  } catch (error) {
    console.error('Error fetching workflows:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workflows', details: (error as Error).message },
      { status: 500 }
    );
  }
}
