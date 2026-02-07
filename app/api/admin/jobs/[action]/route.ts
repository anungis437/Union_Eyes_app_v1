import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * API Route: POST /api/admin/jobs/[action]
 * 
 * Pause, resume, or clean job queues (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from "zod";
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";

export const POST = async (request: NextRequest, { params }: { params: { action: string } }) => {
  return withEnhancedRoleAuth(90, async (request, context) => {
    const user = { id: context.userId, organizationId: context.organizationId };

  // Import job-queue functions only at runtime, not at module load time
    // This prevents bundling bullmq during build phase
    const { pauseQueue, resumeQueue, cleanCompletedJobs } = await import('@/lib/job-queue');
    try {
      // TODO: Check if user is admin

      const { action } = params;
      const body = await request.json();
      const { queue } = body;

      if (!queue) {
        return NextResponse.json(
          { error: 'Queue name is required' },
          { status: 400 }
        );
      }

      switch (action) {
        case 'pause':
          await pauseQueue(queue);
          return NextResponse.json({ success: true, message: `Queue ${queue} paused` });

        case 'resume':
          await resumeQueue(queue);
          return NextResponse.json({ success: true, message: `Queue ${queue} resumed` });

        case 'clean':
          const olderThanMs = body.olderThanMs || 24 * 60 * 60 * 1000; // 24 hours default
          await cleanCompletedJobs(queue, olderThanMs);
          return NextResponse.json({ success: true, message: `Queue ${queue} cleaned` });

        default:
          return NextResponse.json(
            { error: 'Invalid action' },
            { status: 400 }
          );
      }
    } catch (error) {
      console.error('Error performing queue action:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  })
  })(request, { params });
};
