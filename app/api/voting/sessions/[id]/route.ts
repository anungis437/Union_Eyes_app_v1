import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { votingSessions, votingOptions, voterEligibility, votes } from '@/db/schema/domains/governance';
import { and, count } from 'drizzle-orm';
import { z } from 'zod';
import { logApiAuditEvent, SQLInjectionScanner } from '@/lib/middleware/api-security';
import { RequestValidator } from '@/lib/middleware/request-validation';
import { withApiAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';

import { standardSuccessResponse } from '@/lib/api/standardized-responses';
interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * Validation schemas
 */
const updateSessionSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(['draft', 'active', 'paused', 'closed', 'cancelled']).optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  scheduledEndTime: z.string().datetime().optional(),
  settings: z.record(z.unknown()).optional(),
});

export const GET = async (request: NextRequest, { params }: RouteParams) => {
  return withRoleAuth(10, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      if (!userId) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId: 'anonymous',
          endpoint: '/api/voting/sessions/[id]',
          method: 'GET',
          eventType: 'auth_failed',
          severity: 'high',
          details: { reason: 'No authentication provided' },
        });

        return standardErrorResponse(
      ErrorCode.AUTH_REQUIRED,
      'Unauthorized'
    );
      }

      const sessionId = params.id;

      // Check for SQL injection in sessionId
      if (SQLInjectionScanner.scanMethod(sessionId)) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(), userId,
          endpoint: '/api/voting/sessions/[id]',
          method: 'GET',
          eventType: 'auth_failed',
          severity: 'critical',
          details: { reason: 'SQL injection attempt detected in sessionId' },
        });

        return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid session ID format'
    );
      }

      // Get session
      const [session] = await db
        .select()
        .from(votingSessions)
        .where(eq(votingSessions.id, sessionId));

      if (!session) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(), userId,
          endpoint: '/api/voting/sessions/[id]',
          method: 'GET',
          eventType: 'auth_failed',
          severity: 'medium',
          details: { reason: 'Voting session not found', sessionId },
        });

        return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Voting session not found'
    );
      }

      // Get options
      const options = await db
        .select()
        .from(votingOptions)
        .where(eq(votingOptions.sessionId, sessionId))
        .orderBy(votingOptions.orderIndex);

      // Get vote counts per option
      const optionsWithCounts = await Promise.all(
        options.map(async (option) => {
          const [voteCount] = await db
            .select({ count: count() })
            .from(votes)
            .where(eq(votes.optionId, option.id));

          return {
            ...option,
            voteCount: voteCount.count || 0,
          };
        })
      );

      // Get total votes
      const [totalVotesCount] = await db
        .select({ count: count() })
        .from(votes)
        .where(eq(votes.sessionId, sessionId));

      // Check if user has voted
      const [userVote] = await db
        .select()
        .from(votes)
        .where(
          and(
            eq(votes.sessionId, sessionId),
            eq(votes.voterId, userId)
          )
        )
        .limit(1);

      // Check user eligibility
      const [eligibility] = await db
        .select()
        .from(voterEligibility)
        .where(
          and(
            eq(voterEligibility.sessionId, sessionId),
            eq(voterEligibility.memberId, userId)
          )
        )
        .limit(1);

      // Calculate percentages
      const totalVotes = totalVotesCount.count || 0;
      const optionsWithPercentages = optionsWithCounts.map(option => ({
        ...option,
        percentage: totalVotes > 0 
          ? Math.round((option.voteCount / totalVotes) * 100) 
          : 0,
      }));

      // Calculate turnout
      const totalEligible = session.totalEligibleVoters || 0;
      const turnoutPercentage = totalEligible > 0
        ? Math.round((totalVotes / totalEligible) * 100)
        : 0;

      // Check if quorum is met
      const quorumThreshold = session.quorumThreshold || 50;
      const quorumMet = session.requiresQuorum
        ? turnoutPercentage >= quorumThreshold
        : true;

      logApiAuditEvent({
        timestamp: new Date().toISOString(), userId,
        endpoint: '/api/voting/sessions/[id]',
        method: 'GET',
        eventType: 'success',
        severity: 'low',
        details: {
          sessionId,
          totalVotes,
          turnoutPercentage,
        },
      });

      return NextResponse.json({
        session,
        options: optionsWithPercentages,
        stats: {
          totalVotes,
          totalEligibleVoters: totalEligible,
          turnoutPercentage,
          quorumMet,
          quorumThreshold,
        },
        userStatus: {
          hasVoted: !!userVote,
          isEligible: eligibility?.isEligible || false,
          votedOptionId: userVote?.optionId || null,
          votedAt: userVote?.castAt || null,
        },
      });
    } catch (error) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId: 'unknown',
        endpoint: '/api/voting/sessions/[id]',
        method: 'GET',
        eventType: 'auth_failed',
        severity: 'high',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      });
throw error;
    }
    })(request, { params });
};

export const PATCH = async (request: NextRequest, { params }: RouteParams) => {
  return withRoleAuth(20, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      if (!userId) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId: 'anonymous',
          endpoint: '/api/voting/sessions/[id]',
          method: 'PATCH',
          eventType: 'auth_failed',
          severity: 'high',
          details: { reason: 'No authentication provided' },
        });

        return standardErrorResponse(
      ErrorCode.AUTH_REQUIRED,
      'Unauthorized'
    );
      }

      const sessionId = params.id;

      // Check for SQL injection in sessionId
      if (SQLInjectionScanner.scanMethod(sessionId)) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(), userId,
          endpoint: '/api/voting/sessions/[id]',
          method: 'PATCH',
          eventType: 'auth_failed',
          severity: 'critical',
          details: { reason: 'SQL injection attempt detected' },
        });

        return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid session ID format'
    );
      }

      // Get the session first to access organizationId
      const [session] = await db
        .select()
        .from(votingSessions)
        .where(eq(votingSessions.id, sessionId));

      if (!session) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(), userId,
          endpoint: '/api/voting/sessions/[id]',
          method: 'PATCH',
          eventType: 'unauthorized_access',
          severity: 'medium',
          details: { reason: 'Voting session not found' },
        });

        return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Voting session not found'
    );
      }

      // Check if user has admin/LRO permissions
      const hasPermission = await checkAdminPermissions(userId, session.organizationId);
      if (!hasPermission) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(), userId,
          endpoint: '/api/voting/sessions/[id]',
          method: 'PATCH',
          eventType: 'unauthorized_access',
          severity: 'high',
          details: { reason: 'User lacks admin/officer permissions' },
        });

        return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Forbidden - Admin or Officer role required to update voting sessions'
    );
      }

      const body = await request.json();

      // Validate body using Zod schema
      const validationResult = updateSessionSchema.safeParse(body);
      if (!validationResult.success) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(), userId,
          endpoint: '/api/voting/sessions/[id]',
          method: 'PATCH',
          eventType: 'validation_failed',
          severity: 'low',
          details: { errors: validationResult.error.flatten() },
        });

        return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Validation failed'
      // TODO: Migrate additional details: details: validationResult.error.flatten()
    );
      }

      // Update session
      const [updatedSession] = await db
        .update(votingSessions)
        .set(updates)
        .where(eq(votingSessions.id, sessionId))
        .returning();

      if (!updatedSession) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(), userId,
          endpoint: '/api/voting/sessions/[id]',
          method: 'PATCH',
          eventType: 'auth_failed',
          severity: 'high',
          details: { reason: 'Failed to update session' },
        });

        return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Voting session not found'
    );
      }

      logApiAuditEvent({
        timestamp: new Date().toISOString(), userId,
        endpoint: '/api/voting/sessions/[id]',
        method: 'PATCH',
        eventType: 'success',
        severity: 'high',
        details: { sessionId, updatedFields: Object.keys(updates).filter(k => k !== 'updatedAt') },
      });

      return NextResponse.json({
        message: 'Voting session updated successfully',
        session: updatedSession,
      });
    } catch (error) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId: 'unknown',
        endpoint: '/api/voting/sessions/[id]',
        method: 'PATCH',
        eventType: 'auth_failed',
        severity: 'high',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      });
throw error;
    }
    })(request, { params });
};

export const DELETE = async (request: NextRequest, { params }: RouteParams) => {
  return withRoleAuth(20, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      if (!userId) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId: 'anonymous',
          endpoint: '/api/voting/sessions/[id]',
          method: 'DELETE',
          eventType: 'auth_failed',
          severity: 'high',
          details: { reason: 'No authentication provided' },
        });

        return standardErrorResponse(
      ErrorCode.AUTH_REQUIRED,
      'Unauthorized'
    );
      }

      const sessionId = params.id;

      // Check for SQL injection in sessionId
      if (SQLInjectionScanner.scanMethod(sessionId)) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(), userId,
          endpoint: '/api/voting/sessions/[id]',
          method: 'DELETE',
          eventType: 'auth_failed',
          severity: 'critical',
          details: { reason: 'SQL injection attempt detected' },
        });

        return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid session ID format'
    );
      }

      // Check if session exists and has no votes yet
      const [session] = await db
        .select()
        .from(votingSessions)
        .where(eq(votingSessions.id, sessionId));

      if (!session) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(), userId,
          endpoint: '/api/voting/sessions/[id]',
          method: 'DELETE',
          eventType: 'unauthorized_access',
          severity: 'medium',
          details: { reason: 'Voting session not found' },
        });

        return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Voting session not found'
    );
      }

      // Check if user has admin/LRO permissions
      const hasPermission = await checkAdminPermissions(userId, session.organizationId);
      if (!hasPermission) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(), userId,
          endpoint: '/api/voting/sessions/[id]',
          method: 'DELETE',
          eventType: 'unauthorized_access',
          severity: 'high',
          details: { reason: 'User lacks admin/officer permissions' },
        });

        return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Forbidden - Admin or Officer role required to delete voting sessions'
    );
      }

      // Check if there are any votes
      const [voteCount] = await db
        .select({ count: count() })
        .from(votes)
        .where(eq(votes.sessionId, sessionId));

      if (voteCount.count > 0) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(), userId,
          endpoint: '/api/voting/sessions/[id]',
          method: 'DELETE',
          eventType: 'unauthorized_access',
          severity: 'medium',
          details: { reason: 'Cannot delete session with existing votes', voteCount: voteCount.count },
        });

        return NextResponse.json(
          { error: 'Cannot delete session with existing votes. Please close it instead.' },
          { status: 400 }
        );
      }

      // Delete session (cascade will delete options and eligibility)
      await db
        .delete(votingSessions)
        .where(eq(votingSessions.id, sessionId));

      logApiAuditEvent({
        timestamp: new Date().toISOString(), userId,
        endpoint: '/api/voting/sessions/[id]',
        method: 'DELETE',
        eventType: 'success',
        severity: 'high',
        details: { sessionId, action: 'Session deleted' },
      });

      return NextResponse.json({
        message: 'Voting session deleted successfully',
      });
    } catch (error) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId: 'unknown',
        endpoint: '/api/voting/sessions/[id]',
        method: 'DELETE',
        eventType: 'auth_failed',
        severity: 'high',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      });
throw error;
    }
    })(request, { params });
};
