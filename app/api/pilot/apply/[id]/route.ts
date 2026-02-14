/**
 * Pilot Application Individual API
 * 
 * SPRINT 7: Protected with admin authentication
 * 
 * Handles updates to pilot application status and review.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { pilotApplications } from '@/db/schema/domains/marketing';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/middleware/admin-auth';
import { 
  sendPilotApprovalNotification, 
  sendPilotRejectionNotification 
} from '@/lib/integrations/marketing-notifications';

interface RouteContext {
  params: {
    id: string;
  };
}

/**
 * GET /api/pilot/apply/[id]
 * 
 * Get single application
 */
export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = params;

    const [application] = await db
      .select()
      .from(pilotApplications)
      .where(eq(pilotApplications.id, id))
      .limit(1);

    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ application });
  } catch (error) {
    console.error('Error fetching application:', error);
    return NextResponse.json(
      { error: 'Failed to fetch application' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/pilot/apply/[id]
 * 
 * SPRINT 7: Protected - Admin authentication required
 * 
 * Update application (approve/reject/status change)
 */
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  // SPRINT 7: Require admin authentication
  const authResult = await requireAdmin(request);
  if (!authResult.authorized) {
    return authResult.response;
  }

  const { userId } = authResult;

  try {
    const { id } = params;
    const body = await request.json();
    const { status, reviewedBy, reviewedAt, reviewNotes } = body;

    // Validate status if provided
    if (
      status &&
      !['pending', 'approved', 'active', 'completed', 'rejected'].includes(status)
    ) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    // Build update payload
    const updateData = {
      updatedAt: new Date(),
    };

    if (status !== undefined) {
      updateData.status = status;
    }

    if (reviewedBy !== undefined) {
      updateData.reviewedBy = reviewedBy;
    }

    if (reviewedAt !== undefined) {
      updateData.reviewedAt = new Date(reviewedAt);
    }

    if (reviewNotes !== undefined) {
      updateData.reviewNotes = reviewNotes;
    }

    // Update in database
    const [application] = await db
      .update(pilotApplications)
      .set(updateData)
      .where(eq(pilotApplications.id, id))
      .returning();

    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // SPRINT 7: Send notification emails on approval/rejection
    if (status === 'approved' && application.contactEmail) {
      sendPilotApprovalNotification(
        'pilot-pending', // No organizationId yet (pre-approval)
        application.contactEmail,
        application.contactName || 'Applicant',
        application.organizationName,
        application.id,
        reviewNotes
      ).catch((error) => {
        console.error('Failed to send approval notification:', error);
        // Don&apos;t fail the request if notification fails
      });
    } else if (status === 'rejected' && application.contactEmail) {
      sendPilotRejectionNotification(
        'pilot-pending', // No organizationId yet (pre-approval)
        application.contactEmail,
        application.contactName || 'Applicant',
        application.organizationName,
        application.id,
        reviewNotes
      ).catch((error) => {
        console.error('Failed to send rejection notification:', error);
        // Don&apos;t fail the request if notification fails
      });
    }

    return NextResponse.json({ application });
  } catch (error) {
    console.error('Error updating application:', error);
    return NextResponse.json(
      { error: 'Failed to update application' },
      { status: 500 }
    );
  }
}
