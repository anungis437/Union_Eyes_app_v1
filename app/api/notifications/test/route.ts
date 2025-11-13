/**
 * API Route: Test Email Notification
 * 
 * Allows testing email notifications without changing claim status
 * Admin only endpoint for development/testing
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { sendClaimStatusNotification } from '@/lib/claim-notifications';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { claimId, previousStatus, newStatus, notes } = body;

    if (!claimId || !newStatus) {
      return NextResponse.json(
        { error: 'Missing required fields: claimId, newStatus' },
        { status: 400 }
      );
    }

    // Send test notification
    const result = await sendClaimStatusNotification(
      claimId,
      previousStatus,
      newStatus,
      notes
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send notification' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Test notification sent successfully',
    });
  } catch (error) {
    console.error('Error in test email endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
