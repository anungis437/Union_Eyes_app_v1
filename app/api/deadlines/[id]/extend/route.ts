import { NextRequest, NextResponse } from 'next/server';
import { requestDeadlineExtension } from '@/db/queries/deadline-queries';
import { getUserFromRequest } from '@/lib/auth';

/**
 * POST /api/deadlines/[id]/extend
 * Request a deadline extension
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { daysRequested, reason } = body;

    // Validation
    if (!daysRequested || daysRequested < 1) {
      return NextResponse.json(
        { error: 'Days requested must be at least 1' },
        { status: 400 }
      );
    }

    if (!reason || reason.trim().length < 20) {
      return NextResponse.json(
        { error: 'Reason must be at least 20 characters' },
        { status: 400 }
      );
    }

    const extension = await requestDeadlineExtension(
      params.id,
      user.id,
      daysRequested,
      reason.trim()
    );

    return NextResponse.json({
      success: true,
      extension,
      message: daysRequested > 7 
        ? 'Extension request submitted for approval'
        : 'Extension granted automatically',
    });
  } catch (error) {
    console.error('Error requesting extension:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to request extension' },
      { status: 500 }
    );
  }
}
