import { NextRequest, NextResponse } from 'next/server';
import { getOverdueDeadlines } from '@/db/queries/deadline-queries';
import { getUserFromRequest } from '@/lib/auth';

/**
 * GET /api/deadlines/overdue
 * Get all overdue deadlines for the tenant
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const claimId = searchParams.get('claimId');

    const deadlines = await getOverdueDeadlines(
      user.tenantId,
      claimId || undefined
    );

    return NextResponse.json({
      deadlines,
      count: deadlines.length,
    });
  } catch (error) {
    console.error('Error fetching overdue deadlines:', error);
    return NextResponse.json(
      { error: 'Failed to fetch overdue deadlines' },
      { status: 500 }
    );
  }
}
