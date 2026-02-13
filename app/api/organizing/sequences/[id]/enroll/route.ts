/**
 * Sequence Enrollment API
 * 
 * Endpoints:
 * - POST /api/organizing/sequences/[id]/enroll - Enroll member(s) in sequence
 * 
 * Phase 4: Communications & Organizing - Organizer Workflows
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { 
  outreachSequences, 
  outreachEnrollments,
  outreachStepsLog 
} from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * POST /api/organizing/sequences/[id]/enroll
 * Enroll one or more members in an outreach sequence
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organizationId = request.headers.get('x-organization-id');
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 400 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.memberIds || !Array.isArray(body.memberIds) || body.memberIds.length === 0) {
      return NextResponse.json(
        { error: 'memberIds must be a non-empty array' },
        { status: 400 }
      );
    }

    // Fetch sequence to verify it exists and is active
    const sequence = await db
      .select()
      .from(outreachSequences)
      .where(
        and(
          eq(outreachSequences.id, params.id),
          eq(outreachSequences.organizationId, organizationId),
          eq(outreachSequences.isActive, true)
        )
      )
      .limit(1);

    if (sequence.length === 0) {
      return NextResponse.json(
        { error: 'Sequence not found or is not active' },
        { status: 404 }
      );
    }

    const seq = sequence[0];
    const steps = seq.steps as any[];
    const totalSteps = steps.length;

    // Check for existing enrollments
    const existingEnrollments = await db
      .select()
      .from(outreachEnrollments)
      .where(
        and(
          eq(outreachEnrollments.sequenceId, params.id),
          eq(outreachEnrollments.organizationId, organizationId),
          sql`${outreachEnrollments.memberId} = ANY(${body.memberIds})`
        )
      );

    const existingMemberIds = new Set(existingEnrollments.map((e: any) => e.memberId));
    const newMemberIds = body.memberIds.filter((id: string) => !existingMemberIds.has(id));

    if (newMemberIds.length === 0) {
      return NextResponse.json(
        { 
          error: 'All members are already enrolled in this sequence',
          alreadyEnrolled: body.memberIds.length,
        },
        { status: 409 }
      );
    }

    // Calculate first step timing
    const firstStep = steps[0];
    const delayDays = firstStep?.delayDays || 0;
    const nextStepAt = new Date();
    nextStepAt.setDate(nextStepAt.getDate() + delayDays);

    // Create enrollments for new members
    const enrollments = await db
      .insert(outreachEnrollments)
      .values(
        newMemberIds.map((memberId: string) => ({
          organizationId,
          sequenceId: params.id,
          memberId,
          enrolledBy: userId,
          currentStep: 1,
          totalSteps,
          completedSteps: 0,
          status: 'active' as const,
          nextStepAt: nextStepAt,
          metadata: body.metadata || {},
        }))
      )
      .returning();

    // Create initial step log entries for each enrollment
    const stepLogEntries = enrollments.map((enrollment: any) => ({
      organizationId,
      enrollmentId: enrollment.id,
      stepNumber: 1,
      actionType: firstStep?.action || 'unknown',
      status: 'pending' as const,
      scheduledAt: nextStepAt,
      metadata: {
        stepConfig: firstStep,
      },
    }));

    await db.insert(outreachStepsLog).values(stepLogEntries);

    // Update sequence stats
    await db
      .update(outreachSequences)
      .set({
        stats: sql`jsonb_set(
          COALESCE(stats, '{}'::jsonb),
          '{enrolled}',
          to_jsonb(COALESCE((stats->>'enrolled')::int, 0) + ${newMemberIds.length})
        )`,
        updatedAt: new Date(),
      })
      .where(eq(outreachSequences.id, params.id));

    return NextResponse.json({
      success: true,
      enrolled: newMemberIds.length,
      skipped: body.memberIds.length - newMemberIds.length,
      enrollments,
    }, { status: 201 });
  } catch (error) {
    console.error('[API] Error enrolling members in sequence:', error);
    return NextResponse.json(
      { error: 'Failed to enroll members in sequence' },
      { status: 500 }
    );
  }
}
