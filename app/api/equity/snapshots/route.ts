import { withRLSContext } from '@/lib/db/with-rls-context';
import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { checkRateLimit, RATE_LIMITS, createRateLimitHeaders } from '@/lib/rate-limiter';
/**
 * API Route: Equity Snapshots
 * Time-series equity demographics for tracking progress
 * Phase 3: Equity & Demographics - SECURED
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { equitySnapshots } from '@/db/schema';
import { desc } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { z } from "zod";
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';

import { standardSuccessResponse } from '@/lib/api/standardized-responses';
export const dynamic = 'force-dynamic';

export const GET = async (request: NextRequest) => {
  return withEnhancedRoleAuth(60, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      // Rate limiting for equity analytics
      const rateLimitResult = await checkRateLimit(
        `${organizationId}`,
        RATE_LIMITS.EQUITY_ANALYTICS
      );
      
      if (!rateLimitResult.allowed) {
        logger.warn('Rate limit exceeded for equity snapshots', {
          userId,
          organizationId,
          limit: rateLimitResult.limit,
        });
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: '/api/equity/snapshots',
          method: 'GET',
          eventType: 'validation_failed',
          severity: 'medium',
          details: {
            dataType: 'EQUITY_DATA',
            reason: 'Rate limit exceeded',
            limit: rateLimitResult.limit,
          },
        });
        return NextResponse.json(
          {
            error: 'Rate limit exceeded for equity analytics.',
            resetIn: rateLimitResult.resetIn,
          },
          {
            status: 429,
            headers: createRateLimitHeaders(rateLimitResult),
          }
        );
      }

      const { searchParams } = new URL(request.url);
      const requestedOrgId = searchParams.get('organizationId');
      const limit = parseInt(searchParams.get('limit') || '12'); // Default 12 months

      if (!requestedOrgId) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: '/api/equity/snapshots',
          method: 'GET',
          eventType: 'validation_failed',
          severity: 'low',
          details: {
            dataType: 'EQUITY_DATA',
            reason: 'Missing organizationId parameter',
          },
        });
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Bad Request - organizationId is required'
    );
      }

      // Verify organization access (critical for PIPEDA compliance)
      if (requestedOrgId !== organizationId) {
        logger.warn('Unauthorized equity data access attempt', {
          userId,
          requestedOrgId,
          userOrgId: organizationId,
        });
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: '/api/equity/snapshots',
          method: 'GET',
          eventType: 'auth_failed',
          severity: 'critical',
          details: {
            dataType: 'EQUITY_DATA',
            reason: 'Cross-organization access denied - PIPEDA violation attempt',
            requestedOrgId,
          },
        });
        return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Forbidden - Cannot access other organization equity data'
    );
      }

      const snapshots = await db
        .select()
        .from(equitySnapshots)
        .where(eq(equitySnapshots.organizationId, requestedOrgId))
        .orderBy(desc(equitySnapshots.snapshotDate))
        .limit(limit);

      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: '/api/equity/snapshots',
        method: 'GET',
        eventType: 'success',
        severity: 'high',
        details: {
          dataType: 'EQUITY_DATA',
          organizationId: requestedOrgId,
          snapshotCount: snapshots.length,
          privacyCompliant: true,
        },
      });

      return NextResponse.json({
        success: true,
        data: snapshots,
        count: snapshots.length,
      });

    } catch (error) {
      logger.error('Failed to fetch equity snapshots', error as Error, {
        userId,
        organizationId,
        correlationId: request.headers.get('x-correlation-id'),
  });
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: '/api/equity/snapshots',
        method: 'GET',
        eventType: 'server_error',
        severity: 'high',
        details: {
          dataType: 'EQUITY_DATA',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Internal Server Error',
      error
    );
  }
  })(request);
};


const equitySnapshotsSchema = z.object({
  organizationId: z.string().uuid('Invalid organizationId'),
  snapshotDate: z.string().datetime().optional(),
});

export const POST = async (request: NextRequest) => {
  return withEnhancedRoleAuth(60, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      const body = await request.json();
    // Validate request body
    const validation = equitySnapshotsSchema.safeParse(body);
    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request data',
        validation.error.errors
      );
    }
    
    const { organizationId, snapshotDate } = validation.data;
      const { organizationId: requestedOrgId, snapshotDate } = body;
      
      if (!requestedOrgId) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: '/api/equity/snapshots',
          method: 'POST',
          eventType: 'validation_failed',
          severity: 'low',
          details: {
            dataType: 'EQUITY_DATA',
            reason: 'Missing organizationId',
          },
        });
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Bad Request - organizationId is required'
    );
      }

      // Verify organization access
      if (requestedOrgId !== organizationId) {
        logger.warn('Unauthorized equity snapshot generation attempt', {
          userId,
          requestedOrgId,
          userOrgId: organizationId,
        });
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: '/api/equity/snapshots',
          method: 'POST',
          eventType: 'auth_failed',
          severity: 'critical',
          details: {
            dataType: 'EQUITY_DATA',
            reason: 'Cross-organization operation denied',
            requestedOrgId,
          },
        });
        return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Forbidden - Cannot generate snapshots for other organizations'
    );
      }

      const date = snapshotDate || new Date().toISOString().split('T')[0];

      // Call database function to generate snapshot
      const result = await withRLSContext(async (tx) => {
      return await tx.execute(
        sql`SELECT generate_equity_snapshot(${requestedOrgId}::uuid, ${date}::date) as snapshot_id`
      );
    });

      const snapshotId = (result[0] as any).snapshot_id;

      // Fetch the generated snapshot
      const snapshot = await db
        .select()
        .from(equitySnapshots)
        .where(eq(equitySnapshots.id, snapshotId))
        .limit(1);

      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: '/api/equity/snapshots',
        method: 'POST',
        eventType: 'success',
        severity: 'high',
        details: {
          dataType: 'EQUITY_DATA',
          organizationId: requestedOrgId,
          snapshotId,
          snapshotDate: date,
        },
      });

      return NextResponse.json({
        success: true,
        data: snapshot[0],
        message: 'Equity snapshot generated successfully',
      });

    } catch (error) {
      logger.error('Failed to generate equity snapshot', error as Error, {
        userId,
        organizationId,
        correlationId: request.headers.get('x-correlation-id'),
  });
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: '/api/equity/snapshots',
        method: 'POST',
        eventType: 'server_error',
        severity: 'high',
        details: {
          dataType: 'EQUITY_DATA',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Internal Server Error',
      error
    );
  }
  })(request);
};

