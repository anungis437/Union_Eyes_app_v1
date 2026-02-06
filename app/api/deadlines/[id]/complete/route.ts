import { NextRequest, NextResponse } from 'next/server';
import { completeDeadline } from '@/db/queries/deadline-queries';
import { getUserFromRequest } from '@/lib/auth';

/**
 * POST /api/deadlines/[id]/complete
 * Mark a deadline as completed
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
    const { notes } = body;

    const result = await completeDeadline(
      params.id,
      user.id,
      notes
    );

    if (!result) {
      return NextResponse.json(
        { error: 'Deadline not found or already completed' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      deadline: result,
      message: 'Deadline marked as completed',
    });
  } catch (error) {
    console.error('Error completing deadline:', error);
    return NextResponse.json(
      { error: 'Failed to complete deadline' },
      { status: 500 }
    );
  }
}
