import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * API Route: POST /api/admin/jobs/retry
 * 
 * Retry a failed job (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from "zod";
import { withAdminAuth } from '@/lib/api-auth-guard';

export const POST = async (request: NextRequest) => {
  return withAdminAuth(async (request, context) => {
  // Import job-queue functions only at runtime, not at module load time
    // This prevents bundling bullmq during build phase
    const { retryJob } = await import('@/lib/job-queue');
    try {
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
return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
    })(request);
};

