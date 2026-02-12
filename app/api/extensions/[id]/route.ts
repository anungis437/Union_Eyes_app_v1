import { NextRequest, NextResponse } from 'next/server';
import { approveDeadlineExtension, denyDeadlineExtension } from '@/db/queries/deadline-queries';
import { withMinRole, getCurrentUser } from '@/lib/api-auth-guard';

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
/**
 * PATCH /api/extensions/[id]
 * Approve or deny a deadline extension request
 */
export const PATCH = withMinRole('steward', async (request: NextRequest, context: any) => {
  try {
    const user = await getCurrentUser();
    const userId = user?.id;
    const params = context?.params as { id: string } | undefined;

    if (!userId || !params?.id) {
      return standardErrorResponse(
        ErrorCode.AUTH_REQUIRED,
        'Unauthorized'
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
      return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid action. Use '
    );
    }
  } catch (error) {
return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process extension' },
      { status: 500 }
    );
  }
});
