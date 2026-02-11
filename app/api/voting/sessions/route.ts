import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { votingSessions, votingOptions, voterEligibility, votes } from '@/db/schema/domains/governance';
import { eq, desc, and, count } from 'drizzle-orm';
import { z } from 'zod';
import { logApiAuditEvent } from '@/lib/middleware/api-security';
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { withRLSContext } from '@/lib/db/with-rls-context';

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
/**
 * Validation schemas
 */
const listSessionsSchema = z.object({
  status: z.enum(['draft', 'active', 'closed']).optional(),
  type: z.enum(['convention', 'ratification', 'special_vote']).optional(),
  includeStats: z.string().transform(v => v === 'true').optional(),
});

const createSessionSchema = z.object({
  title: z.string().min(3).max(255),
  description: z.string().optional(),
  type: z.enum(['convention', 'ratification', 'special_vote']),
  meetingType: z.enum(['convention', 'ratification', 'emergency', 'special']),
  organizationId: z.string().uuid(),
  startTime: z.string().datetime().optional(),
  scheduledEndTime: z.string().datetime().optional(),
  allowAnonymous: z.boolean().optional(),
  requiresQuorum: z.boolean().optional(),
  quorumThreshold: z.number().int().min(0).max(100).optional(),
  settings: z.record(z.unknown()).optional(),
  options: z.array(z.string()).optional(),
});

/**
 * GET /api/voting/sessions
 * List voting sessions with optional filters
 */
export const GET = withRoleAuth(10, async (request, context) => {
  const parsed = listSessionsSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) {
    return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid request parameters'
    );
  }

  const query = parsed.data;
  const { userId, organizationId } = context;

  const orgId = (query as Record<string, unknown>)["organizationId"] ?? (query as Record<string, unknown>)["orgId"] ?? (query as Record<string, unknown>)["organization_id"] ?? (query as Record<string, unknown>)["org_id"] ?? (query as Record<string, unknown>)["tenantId"] ?? (query as Record<string, unknown>)["tenant_id"] ?? (query as Record<string, unknown>)["unionId"] ?? (query as Record<string, unknown>)["union_id"] ?? (query as Record<string, unknown>)["localId"] ?? (query as Record<string, unknown>)["local_id"];
  if (typeof orgId === 'string' && orgId.length > 0 && orgId !== context.organizationId) {
    return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Forbidden'
    );
  }

try {
      const { status, type, includeStats } = query;

    // Build where conditions
    const whereConditions = [];
    
    if (status) {
      whereConditions.push(eq(votingSessions.status, status));
    }
    
    if (type) {
      whereConditions.push(eq(votingSessions.type, type));
    }

    // Get sessions
    const sessions = await db
      .select()
      .from(votingSessions)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(votingSessions.createdAt));

    // Optionally include vote counts and eligibility
    if (includeStats) {
      const sessionsWithStats = await Promise.all(
        sessions.map(async (session) => {
          // Get vote count
          const [voteCount] = await withRLSContext({ organizationId }, async (db) => {
            return await db
              .select({ count: count() })
              .from(votes)
              .where(eq(votes.sessionId, session.id));
          });

          // Get options count
          const [optionsCount] = await withRLSContext({ organizationId }, async (db) => {
            return await db
              .select({ count: count() })
              .from(votingOptions)
              .where(eq(votingOptions.sessionId, session.id));
          });

            // Check if user has voted
            const [userVote] = await withRLSContext({ organizationId }, async (db) => {
              return await db
                .select()
                .from(votes)
                .where(
                  and(
                    eq(votes.sessionId, session.id),
                    eq(votes.voterId, userId)
                  )
                )
                .limit(1);
            });

            // Check if user is eligible
            const [eligibility] = await withRLSContext({ organizationId }, async (db) => {
              return await db
                .select()
                .from(voterEligibility)
                .where(
                  and(
                    eq(voterEligibility.sessionId, session.id),
                    eq(voterEligibility.memberId, userId)
                  )
                )
                .limit(1);
            });

          return {
            ...session,
            stats: {
              totalVotes: voteCount.count || 0,
              totalOptions: optionsCount.count || 0,
              hasVoted: !!userVote,
              isEligible: eligibility?.isEligible || false,
              turnoutPercentage: (session.totalEligibleVoters || 0) > 0
                ? Math.round((voteCount.count / (session.totalEligibleVoters || 1)) * 100)
                : 0,
            },
          };
        })
      );

      logApiAuditEvent({
        timestamp: new Date().toISOString(), userId,
        endpoint: '/api/voting/sessions',
        method: 'GET',
        eventType: 'success',
        severity: 'low',
        details: { resultCount: sessionsWithStats.length, includeStats: true },
      });

      return NextResponse.json({ sessions: sessionsWithStats });
    }

    logApiAuditEvent({
      timestamp: new Date().toISOString(), userId,
      endpoint: '/api/voting/sessions',
      method: 'GET',
      eventType: 'success',
      severity: 'low',
      details: { resultCount: sessions.length },
    });

    return NextResponse.json({ sessions });
  } catch (error) {
    logApiAuditEvent({
      timestamp: new Date().toISOString(), userId,
      endpoint: '/api/voting/sessions',
      method: 'GET',
      eventType: 'auth_failed',
      severity: 'high',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
    });

    throw error;
  }
});

/**
 * POST /api/voting/sessions
 * Create a new voting session (admin/officer only)
 */
export const POST = withRoleAuth(20, async (request, context) => {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid JSON in request body',
      error
    );
  }

  const parsed = createSessionSchema.safeParse(rawBody);
  if (!parsed.success) {
    return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid request body',
      error
    );
  }

  const body = parsed.data;
  const { userId, organizationId } = context;

  const orgId = (body as Record<string, unknown>)["organizationId"] ?? (body as Record<string, unknown>)["orgId"] ?? (body as Record<string, unknown>)["organization_id"] ?? (body as Record<string, unknown>)["org_id"] ?? (body as Record<string, unknown>)["tenantId"] ?? (body as Record<string, unknown>)["tenant_id"] ?? (body as Record<string, unknown>)["unionId"] ?? (body as Record<string, unknown>)["union_id"] ?? (body as Record<string, unknown>)["localId"] ?? (body as Record<string, unknown>)["local_id"];
  if (typeof orgId === 'string' && orgId.length > 0 && orgId !== context.organizationId) {
    return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Forbidden',
      error
    );
  }

try {
      const {
        title,
        description,
        type,
        meetingType,
        organizationId,
        startTime,
        scheduledEndTime,
        allowAnonymous = true,
        requiresQuorum = true,
        quorumThreshold = 50,
        settings = {},
        options,
      } = body;

      // Check if user has admin/officer permissions
      const member = await withRLSContext({ organizationId }, async (db) => {
        return await db.query.organizationMembers.findFirst({
          where: (organizationMembers, { eq, and }) =>
            and(
              eq(organizationMembers.userId, context.userId),
              eq(organizationMembers.organizationId, organizationId)
            ),
        });
      });

      // Allow admin and officer roles to create voting sessions
      if (!member || !['admin', 'officer', 'super_admin'].includes(member.role)) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(), userId,
          endpoint: '/api/voting/sessions',
          method: 'POST',
          eventType: 'unauthorized_access',
          severity: 'high',
          details: { reason: 'Non-admin attempted voting session creation', userRole: member?.role },
        });

        return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Forbidden - Admin or Officer role required'
    );
      }

      // Create session
      const [newSession] = await withRLSContext({ organizationId }, async (db) => {
        return await db
          .insert(votingSessions)
          .values({
            title,
            description,
            type,
            meetingType,
            organizationId,
            createdBy: userId,
            startTime: startTime ? new Date(startTime) : undefined,
            scheduledEndTime: scheduledEndTime ? new Date(scheduledEndTime) : undefined,
            allowAnonymous,
            requiresQuorum,
            quorumThreshold,
            settings,
            status: 'draft',
          })
          .returning();
      });

      // Create voting options if provided
      if (options && Array.isArray(options) && options.length > 0) {
        const optionValues = options.map((optionText: string, index: number) => ({
          sessionId: newSession.id,
          text: optionText,
          orderIndex: index,
        }));

        await withRLSContext({ organizationId }, async (db) => {
          return await db.insert(votingOptions).values(optionValues);
        });
      }

      logApiAuditEvent({
        timestamp: new Date().toISOString(), userId,
        endpoint: '/api/voting/sessions',
        method: 'POST',
        eventType: 'success',
        severity: 'medium',
        details: {
          sessionId: newSession.id,
          title,
          organizationId,
          optionsCount: options?.length || 0,
        },
      });

      return standardSuccessResponse(
      { 
        message: 'Voting session created successfully',
        session: newSession,
       },
      undefined,
      201
    );
    } catch (error) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(), userId,
        endpoint: '/api/voting/sessions',
        method: 'POST',
        eventType: 'auth_failed',
        severity: 'high',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      });

      throw error;
    }
});


