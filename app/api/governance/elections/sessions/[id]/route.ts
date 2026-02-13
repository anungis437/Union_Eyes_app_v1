/**
 * Individual Voting Session API
 * 
 * Manages specific voting session details, updates, and lifecycle
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { votingSessions, voterEligibility, votes, votingOptions, votingAuditLog } from '@/db/schema/voting-schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { z } from 'zod';

// Validation schema for updating session
const updateSessionSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().optional(),
  scheduledEndTime: z.string().datetime().optional(),
  allowAnonymous: z.boolean().optional(),
  requiresQuorum: z.boolean().optional(),
  quorumThreshold: z.number().min(0).max(100).optional(),
  totalEligibleVoters: z.number().min(0).optional(),
  settings: z.record(z.any()).optional(),
});

// Validation schema for session status change
const changeStatusSchema = z.object({
  status: z.enum(['draft', 'active', 'paused', 'closed', 'cancelled']),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
});

/**
 * GET /api/governance/elections/sessions/[id]
 * Get voting session details with statistics
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;
    
    // Get session details with vote statistics
    const [session] = await db
      .select({
        id: votingSessions.id,
        title: votingSessions.title,
        description: votingSessions.description,
        type: votingSessions.type,
        status: votingSessions.status,
        meetingType: votingSessions.meetingType,
        organizationId: votingSessions.organizationId,
        createdBy: votingSessions.createdBy,
        createdAt: votingSessions.createdAt,
        updatedAt: votingSessions.updatedAt,
        startTime: votingSessions.startTime,
        endTime: votingSessions.endTime,
        scheduledEndTime: votingSessions.scheduledEndTime,
        allowAnonymous: votingSessions.allowAnonymous,
        requiresQuorum: votingSessions.requiresQuorum,
        quorumThreshold: votingSessions.quorumThreshold,
        totalEligibleVoters: votingSessions.totalEligibleVoters,
        settings: votingSessions.settings,
        metadata: votingSessions.metadata,
        totalVotes: sql<number>`(
          SELECT COUNT(*)::int 
          FROM ${votes} 
          WHERE ${votes.sessionId} = ${votingSessions.id}
        )`,
        uniqueVoters: sql<number>`(
          SELECT COUNT(DISTINCT ${votes.voterId})::int 
          FROM ${votes} 
          WHERE ${votes.sessionId} = ${votingSessions.id}
        )`,
      })
      .from(votingSessions)
      .where(eq(votingSessions.id, sessionId));
    
    if (!session) {
      return NextResponse.json(
        { error: 'Voting session not found' },
        { status: 404 }
      );
    }
    
    // Get voting options with vote counts
    const options = await db
      .select({
        id: votingOptions.id,
        sessionId: votingOptions.sessionId,
        text: votingOptions.text,
        description: votingOptions.description,
        orderIndex: votingOptions.orderIndex,
        isDefault: votingOptions.isDefault,
        metadata: votingOptions.metadata,
        voteCount: sql<number>`(
          SELECT COUNT(*)::int 
          FROM ${votes} 
          WHERE ${votes.optionId} = ${votingOptions.id}
        )`,
      })
      .from(votingOptions)
      .where(eq(votingOptions.sessionId, sessionId))
      .orderBy(votingOptions.orderIndex);
    
    // Calculate quorum status
    const quorumMet = session.requiresQuorum
      ? (session.uniqueVoters / session.totalEligibleVoters) * 100 >= session.quorumThreshold
      : true;
    
    // Calculate turnout percentage
    const turnoutPercentage = session.totalEligibleVoters > 0
      ? (session.uniqueVoters / session.totalEligibleVoters) * 100
      : 0;
    
    return NextResponse.json({
      ...session,
      options,
      statistics: {
        turnoutPercentage: Math.round(turnoutPercentage * 100) / 100,
        quorumMet,
        quorumPercentage: Math.round(turnoutPercentage * 100) / 100,
      },
    });
  } catch (error: any) {
    console.error('Error fetching voting session:', error);
    return NextResponse.json(
      { error: 'Failed to fetch voting session', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/governance/elections/sessions/[id]
 * Update voting session details
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;
    const body = await req.json();
    
    // Check if this is a status change or details update
    if (body.status) {
      const validatedData = changeStatusSchema.parse(body);
      
      // Validate state transitions
      const [currentSession] = await db
        .select({ status: votingSessions.status })
        .from(votingSessions)
        .where(eq(votingSessions.id, sessionId));
      
      if (!currentSession) {
        return NextResponse.json(
          { error: 'Voting session not found' },
          { status: 404 }
        );
      }
      
      // Validate transition
      const validTransitions: Record<string, string[]> = {
        draft: ['active', 'cancelled'],
        active: ['paused', 'closed'],
        paused: ['active', 'closed'],
        closed: [],
        cancelled: [],
      };
      
      if (!validTransitions[currentSession.status]?.includes(validatedData.status)) {
        return NextResponse.json(
          { 
            error: 'Invalid status transition',
            currentStatus: currentSession.status,
            requestedStatus: validatedData.status,
          },
          { status: 400 }
        );
      }
      
      // Update status with timestamps
      const updateData: any = {
        status: validatedData.status,
        updatedAt: new Date(),
      };
      
      if (validatedData.status === 'active' && !currentSession.status) {
        updateData.startTime = validatedData.startTime || new Date();
      }
      
      if (validatedData.status === 'closed') {
        updateData.endTime = validatedData.endTime || new Date();
      }
      
      const [updatedSession] = await db
        .update(votingSessions)
        .set(updateData)
        .where(eq(votingSessions.id, sessionId))
        .returning();
      
      return NextResponse.json({
        message: 'Voting session status updated',
        session: updatedSession,
      });
    } else {
      // Regular details update
      const validatedData = updateSessionSchema.parse(body);
      
      const [updatedSession] = await db
        .update(votingSessions)
        .set({
          ...validatedData,
          updatedAt: new Date(),
        })
        .where(eq(votingSessions.id, sessionId))
        .returning();
      
      if (!updatedSession) {
        return NextResponse.json(
          { error: 'Voting session not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({
        message: 'Voting session updated',
        session: updatedSession,
      });
    }
  } catch (error: any) {
    console.error('Error updating voting session:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update voting session', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/governance/elections/sessions/[id]
 * Cancel voting session (soft delete - sets status to cancelled)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;
    
    // Check if session has votes
    const [voteCount] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(votes)
      .where(eq(votes.sessionId, sessionId));
    
    if (voteCount.count > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete session with votes',
          voteCount: voteCount.count,
          suggestion: 'Cancel the session instead',
        },
        { status: 400 }
      );
    }
    
    // Soft delete by setting status to cancelled
    const [cancelledSession] = await db
      .update(votingSessions)
      .set({
        status: 'cancelled',
        endTime: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(votingSessions.id, sessionId))
      .returning();
    
    if (!cancelledSession) {
      return NextResponse.json(
        { error: 'Voting session not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      message: 'Voting session cancelled',
      session: cancelledSession,
    });
  } catch (error: any) {
    console.error('Error cancelling voting session:', error);
    return NextResponse.json(
      { error: 'Failed to cancel voting session', details: error.message },
      { status: 500 }
    );
  }
}
