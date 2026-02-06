/**
 * API Route: Organization Tree
 * Get the full organization hierarchy tree
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getOrganizationTree } from '@/db/queries/organization-queries';
import { logger } from '@/lib/logger';

/**
 * GET /api/organizations/tree
 * Get the complete organization hierarchy as a tree structure
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const rootId = searchParams.get('rootId');
    
    const tree = await getOrganizationTree(rootId || undefined);

    return NextResponse.json({
      success: true,
      data: tree,
    });
  } catch (error) {
    logger.error('Error fetching organization tree', error as Error, {      correlationId: request.headers.get('x-correlation-id')
    });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch organization tree' },
      { status: 500 }
    );
  }
}
