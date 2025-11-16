import { NextRequest, NextResponse } from 'next/server';
import { approveDeadlineExtension, denyDeadlineExtension } from '@/db/queries/deadline-queries';
import { getUserFromRequest } from '@/lib/auth';
import { hasPermission } from '@/lib/rbac';

/**
 * PATCH /api/extensions/[id]
 * Approve or deny a deadline extension request
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has permission to approve/deny extensions
    const canApprove = await hasPermission(user.id, 'deadline:approve_extension');
    if (!canApprove) {
      return NextResponse.json(
        { error: 'Insufficient permissions to approve/deny extensions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, daysGranted, notes, reason } = body;

    if (action === 'approve') {
      if (!daysGranted || daysGranted < 1) {
        return NextResponse.json(
          { error: 'Days granted must be at least 1' },
          { status: 400 }
        );
      }

      const extension = await approveDeadlineExtension(
        params.id,
        user.id,
        daysGranted,
        notes
      );

      return NextResponse.json({
        success: true,
        extension,
        message: 'Extension approved successfully',
      });
    } else if (action === 'deny') {
      if (!reason || reason.trim().length < 20) {
        return NextResponse.json(
          { error: 'Denial reason must be at least 20 characters' },
          { status: 400 }
        );
      }

      const extension = await denyDeadlineExtension(
        params.id,
        user.id,
        reason.trim()
      );

      return NextResponse.json({
        success: true,
        extension,
        message: 'Extension denied',
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "approve" or "deny"' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error processing extension:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process extension' },
      { status: 500 }
    );
  }
}
