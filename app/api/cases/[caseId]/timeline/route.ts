/**
 * Case Timeline API Endpoint
 * 
 * GET /api/cases/[caseId]/timeline - Fetch case status history for timeline visualization
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { grievances } from '@/db/schema/domains/claims';
import { eq } from 'drizzle-orm';
import { TimelineContext } from '@/lib/member-experience/timeline-builder';

interface RouteParams {
  params: {
    caseId: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // In production, this should verify the user has permission to view this case
    // via RLS or explicit permission check

    // Fetch the grievance case
    const [grievance] = await db
      .select()
      .from(grievances)
      .where(eq(grievances.id, params.caseId))
      .limit(1);

    if (!grievance) {
      return NextResponse.json(
        { error: 'Case not found' },
        { status: 404 }
      );
    }

    // Build status history from grievance data
    // In production, this would query a separate status_history table
    const timeline = grievance.timeline || [
      {
        date: grievance.createdAt?.toISOString() || new Date().toISOString(),
        action: 'submitted',
        actor: grievance.grievantId || 'unknown',
        notes: 'Case submitted',
      },
    ];

    // If current status is different from last timeline entry, add it
    const lastTimelineAction = timeline[timeline.length - 1]?.action;
    if (lastTimelineAction !== grievance.status) {
      timeline.push({
        date: grievance.updatedAt?.toISOString() || new Date().toISOString(),
        action: grievance.status,
        actor: grievance.lastUpdatedBy || 'system',
        notes: `Status changed to ${grievance.status}`,
      });
    }

    // Build timeline context
    const timelineContext: TimelineContext = {
      caseId: grievance.id,
      currentStatus: grievance.status,
      statusHistory: timeline.map(t => ({
        status: t.action,
        timestamp: new Date(t.date),
        metadata: { actor: t.actor, notes: t.notes },
      })),
      priority: grievance.priority || undefined,
      assignedSteward: grievance.unionRepId
        ? {
            id: grievance.unionRepId,
            name: 'Union Representative',
          }
        : undefined,
      caseType: grievance.type,
    };

    return NextResponse.json({ timeline: timelineContext });
  } catch (error) {
    console.error('Failed to fetch case timeline:', error);
    return NextResponse.json(
      { error: 'Failed to fetch case timeline' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cases/[caseId]/timeline - Add a status update to the timeline
 * (Used by stewards/admins to manually track status changes)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const body = await request.json();
    const { newStatus, metadata } = body;

    if (!newStatus) {
      return NextResponse.json(
        { error: 'newStatus is required' },
        { status: 400 }
      );
    }

    // Fetch current grievance
    const [grievance] = await db
      .select()
      .from(grievances)
      .where(eq(grievances.id, params.caseId))
      .limit(1);

    if (!grievance) {
      return NextResponse.json(
        { error: 'Case not found' },
        { status: 404 }
      );
    }

    // Add new status to timeline
    const timeline = grievance.timeline || [];
    timeline.push({
      date: new Date().toISOString(),
      action: newStatus,
      actor: 'system', // TODO: Get actual user ID from auth context
      notes: metadata?.notes || `Status updated to ${newStatus}`,
    });

    // Update grievance
    await db
      .update(grievances)
      .set({
        status: newStatus,
        timeline,
        updatedAt: new Date(),
      })
      .where(eq(grievances.id, params.caseId));

    // TODO: Send notification to member about status change
    // await sendStatusUpdateNotification(params.caseId, grievance.status, newStatus);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update case status:', error);
    return NextResponse.json(
      { error: 'Failed to update case status' },
      { status: 500 }
    );
  }
}
