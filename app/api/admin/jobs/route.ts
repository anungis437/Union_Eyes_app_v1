/**
 * API Route: GET /api/admin/jobs
 * 
 * Get job queue statistics (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

// This route uses dynamic features and must not be statically generated
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Import job-queue functions only at runtime, not at module load time
  // This prevents bundling bullmq during build phase
  const { getAllQueueStats, getFailedJobs } = await import('@/lib/job-queue');
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // TODO: Check if user is admin

    const searchParams = request.nextUrl.searchParams;
    const queue = searchParams.get('queue');
    const showFailed = searchParams.get('showFailed') === 'true';

    if (queue && showFailed) {
      // Get failed jobs for specific queue
      const failedJobs = await getFailedJobs(queue, 20);
      
      return NextResponse.json({
        queue,
        failed: failedJobs.map((job: any) => ({
          id: job.id,
          name: job.name,
          data: job.data,
          failedReason: job.failedReason,
          attemptsMade: job.attemptsMade,
          timestamp: job.timestamp,
        })),
      });
    }

    // Get stats for all queues
    const stats = await getAllQueueStats();

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Error fetching job queue stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
