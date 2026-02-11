import { NextRequest, NextResponse } from 'next/server';
import { approveDeadlineExtension, denyDeadlineExtension } from '@/db/queries/deadline-queries';
import { requireApiAuth } from '@/lib/api-auth-guard';

/**
 * PATCH /api/extensions/[id]
 * Approve or deny a deadline extension request
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await requireApiAuth({
      tenant: true,
      roles: ['admin', 'steward', 'officer'],
    });

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
        userId,
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
        userId,
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
return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process extension' },
      { status: 500 }
    );
  }
}
