import { NextRequest, NextResponse } from 'next/server';
import { getDeadlineComplianceMetrics } from '@/db/queries/deadline-queries';
import { getUserFromRequest } from '@/lib/auth';

/**
 * GET /api/deadlines/compliance
 * Get deadline compliance metrics for reporting
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
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      );
    }

    const metrics = await getDeadlineComplianceMetrics(
      user.tenantId,
      new Date(startDate),
      new Date(endDate)
    );

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Error fetching compliance metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch compliance metrics' },
      { status: 500 }
    );
  }
}
