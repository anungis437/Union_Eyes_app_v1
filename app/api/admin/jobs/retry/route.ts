/**
 * API Route: POST /api/admin/jobs/retry
 * 
 * Retry a failed job (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { retryJob } from '@/lib/job-queue';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // TODO: Check if user is admin

    const body = await request.json();
    const { queue, jobId } = body;

    if (!queue || !jobId) {
      return NextResponse.json(
        { error: 'Queue and jobId are required' },
        { status: 400 }
      );
    }

    await retryJob(queue, jobId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error retrying job:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
