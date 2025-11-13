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

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (for security)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: Implement once deadline field is added to claims schema
    console.log('Overdue notifications cron triggered, but deadline tracking not yet implemented');

    return NextResponse.json({
      success: true,
      message: 'Deadline tracking not yet implemented in claims schema',
      total: 0,
      sent: 0,
      failed: 0,
      claims: [],
    });

    /* IMPLEMENTATION PENDING - Requires deadline field in claims schema
    
    import { db } from '@/db/db';
    import { claims } from '@/db/schema/claims-schema';
    import { lt, and, notInArray } from 'drizzle-orm';
    import { sendOverdueClaimNotification } from '@/lib/claim-notifications';
    
    // Get all overdue claims (deadline passed, not closed/rejected)
    const now = new Date();
    const overdueClaims = await db
      .select({
        claimId: claims.claimId,
        claimType: claims.claimType,
        status: claims.status,
        deadline: claims.deadline,
      })
      .from(claims)
      .where(
        and(
          lt(claims.deadline, now),
          notInArray(claims.status, ['closed', 'rejected', 'resolved'])
        )
      );

    // Send notifications for each overdue claim
    const results = await Promise.allSettled(
      overdueClaims.map((claim) =>
        sendOverdueClaimNotification(claim.claimId)
      )
    );

    // Count successes and failures
    const successes = results.filter((r) => r.status === 'fulfilled').length;
    const failures = results.filter((r) => r.status === 'rejected').length;

    console.log(
      `Overdue notification job: ${successes} sent, ${failures} failed, ${overdueClaims.length} total`
    );

    return NextResponse.json({
      success: true,
      total: overdueClaims.length,
      sent: successes,
      failed: failures,
      claims: overdueClaims.map((c) => ({
        claimId: c.claimId,
        claimType: c.claimType,
        status: c.status,
      })),
    });
    */
  } catch (error) {
    console.error('Error in overdue notification cron:', error);
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
