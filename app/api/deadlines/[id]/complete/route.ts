import { NextRequest, NextResponse } from 'next/server';
import { completeDeadline } from '@/db/queries/deadline-queries';
import { getCurrentUser } from '@/lib/api-auth-guard';

/**
 * POST /api/deadlines/[id]/complete
 * Mark a deadline as completed
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: userId } = user;

    const body = await request.json();
    const { notes } = body;

    const result = await completeDeadline(
      params.id,
      userId,
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
