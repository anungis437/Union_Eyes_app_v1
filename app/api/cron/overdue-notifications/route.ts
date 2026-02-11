/**
 * API Route: Send Overdue Claim Notifications
 * 
 * Cron job endpoint to check for overdue claims and send notifications
 * Should be called daily via cron service (e.g., Vercel Cron)
 * 
 * NOTE: Deadline tracking not yet implemented in claims schema
 * This endpoint is a placeholder for future implementation
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { deadlines } from '@/db/schema/deadlines-schema';
import { and, eq } from 'drizzle-orm';
import { sendOverdueClaimNotification } from '@/lib/claim-notifications';

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (for security)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const overdueDeadlines = await db
      .select({ claimId: deadlines.claimId })
      .from(deadlines)
      .where(
        and(
          eq(deadlines.status, 'pending'),
          eq(deadlines.isOverdue, true)
        )
      );

    const claimIds = Array.from(new Set(overdueDeadlines.map((d) => d.claimId)));
    const results = await Promise.allSettled(
      claimIds.map((claimId) => sendOverdueClaimNotification(claimId))
    );

    const sent = results.filter((r) => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.filter((r) => r.status === 'rejected').length + (claimIds.length - sent);

    return NextResponse.json({
      success: true,
      total: claimIds.length,
      sent,
      failed,
      claims: claimIds.map((claimId) => ({ claimId })),
    });
  } catch (error) {
return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
}

