/**
 * Case Timeline API Endpoint
 * 
 * GET /api/cases/[caseId]/timeline - Fetch case status history for timeline visualization
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { grievances } from '@/db/schema/domains/claims';
import { organizationMembers } from '@/db/schema-organizations';
import { eq, and } from 'drizzle-orm';
import { TimelineContext } from '@/lib/member-experience/timeline-builder';
import { requireUserForOrganization } from '@/lib/api-auth-guard';
import { getNotificationService } from '@/lib/services/notification-service';

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

    const authContext = await requireUserForOrganization(grievance.organizationId);

    // Add new status to timeline
    const timeline = grievance.timeline || [];
    timeline.push({
      date: new Date().toISOString(),
      action: newStatus,
      actor: authContext.userId,
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

    // Send notification to member about status change
    try {
      if (grievance.grievantId) {
        // Get member email from organization_members table
        const [member] = await db
          .select({
            email: organizationMembers.email,
            name: organizationMembers.fullName,
          })
          .from(organizationMembers)
          .where(
            and(
              eq(organizationMembers.userId, grievance.grievantId),
              eq(organizationMembers.organizationId, grievance.organizationId)
            )
          )
          .limit(1);

        if (member?.email) {
          const notificationService = getNotificationService();
          await notificationService.send({
            organizationId: grievance.organizationId,
            recipientEmail: member.email,
            type: 'email',
            priority: 'normal',
            subject: `Case ${grievance.grievanceNumber} Status Update`,
            title: 'Case Status Update',
            body: `Your case status has been updated from "${grievance.status}" to "${newStatus}".\n\nCase Number: ${grievance.grievanceNumber}\nNew Status: ${newStatus}\n${metadata?.notes ? `Notes: ${metadata.notes}` : ''}`,
            htmlBody: `
              <h2>Case Status Update</h2>
              <p>Hello ${member.name || 'Member'},</p>
              <p>Your case status has been updated:</p>
              <ul>
                <li><strong>Case Number:</strong> ${grievance.grievanceNumber}</li>
                <li><strong>Previous Status:</strong> ${grievance.status}</li>
                <li><strong>New Status:</strong> ${newStatus}</li>
                ${metadata?.notes ? `<li><strong>Notes:</strong> ${metadata.notes}</li>` : ''}
              </ul>
              <p>If you have any questions, please contact your union representative.</p>
            `,
            metadata: {
              caseId: params.caseId,
              caseNumber: grievance.grievanceNumber,
              oldStatus: grievance.status,
              newStatus,
            },
          });
        }
      }
    } catch (notificationError) {
      // Log error but don't fail the status update
      console.error('Failed to send status update notification:', notificationError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message.startsWith('Forbidden')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    console.error('Failed to update case status:', error);
    return NextResponse.json(
      { error: 'Failed to update case status' },
      { status: 500 }
    );
  }
}
