/**
 * API Route: GET /api/admin/jobs
 * 
 * Get job queue statistics (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { organizationUsers } from '@/db/schema/domains/member';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { logApiAuditEvent } from '@/lib/middleware/api-security';
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
// This route uses dynamic features and must not be statically generated
export const dynamic = 'force-dynamic';

/**
 * Validation schemas
 */
const jobsQuerySchema = z.object({
  queue: z.string().optional(),
  showFailed: z.string().transform(v => v === 'true').optional(),
});

/**
 * Helper to check admin role
 */
async function checkAdminRole(userId: string): Promise<boolean> {
  try {
    const admin = await db
      .select({ role: organizationUsers.role })
      .from(organizationUsers)
      .where(eq(organizationUsers.userId, userId))
      .limit(1);
    return admin.length > 0 && admin[0].role === 'admin';
  } catch (_error) {
    return false;
  }
}

/**
 * GET /api/admin/jobs
 * Get job queue statistics (admin only)
 */
export const GET = withRoleAuth(90, async (request, context) => {
  const parsed = jobsQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) {
    return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid request parameters',
      error
    );
  }

  const query = parsed.data;
  const { userId, organizationId } = context;

  const orgId = (query as Record<string, unknown>)["organizationId"] ?? (query as Record<string, unknown>)["orgId"] ?? (query as Record<string, unknown>)["organization_id"] ?? (query as Record<string, unknown>)["org_id"] ?? (query as Record<string, unknown>)["tenantId"] ?? (query as Record<string, unknown>)["tenant_id"] ?? (query as Record<string, unknown>)["unionId"] ?? (query as Record<string, unknown>)["union_id"] ?? (query as Record<string, unknown>)["localId"] ?? (query as Record<string, unknown>)["local_id"];
  if (typeof orgId === 'string' && orgId.length > 0 && orgId !== organizationId) {
    return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Forbidden',
      error
    );
  }

// Import job-queue functions only at runtime, not at module load time
    // This prevents bundling bullmq during build phase
    const { getAllQueueStats, getFailedJobs } = await import('@/lib/job-queue');

    try {
      // Check if user is admin
      const isAdmin = await checkAdminRole(userId);
      if (!isAdmin) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(), userId,
          endpoint: '/api/admin/jobs',
          method: 'GET',
          eventType: 'unauthorized_access',
          severity: 'high',
          details: { reason: 'Non-admin attempted to access job queue' },
        });

        return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Forbidden - Admin role required'
    );
      }

      const { queue, showFailed } = query;

      if (queue && showFailed) {
        // Get failed jobs for specific queue
        const failedJobs = await getFailedJobs(queue, 20);

        logApiAuditEvent({
          timestamp: new Date().toISOString(), userId,
          endpoint: '/api/admin/jobs',
          method: 'GET',
          eventType: 'success',
          severity: 'medium',
          details: {
            action: 'Retrieved failed jobs',
            queue,
            failedCount: failedJobs.length,
          },
        });

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

      logApiAuditEvent({
        timestamp: new Date().toISOString(), userId,
        endpoint: '/api/admin/jobs',
        method: 'GET',
        eventType: 'success',
        severity: 'low',
        details: {
          action: 'Retrieved queue statistics',
          queueCount: stats.length,
        },
      });

      return NextResponse.json({ stats });
    } catch (error) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(), userId,
        endpoint: '/api/admin/jobs',
        method: 'GET',
        eventType: 'auth_failed',
        severity: 'high',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      });
throw error;
    }
});


