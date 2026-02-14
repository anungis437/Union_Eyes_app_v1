/**
 * Notification Queue Processor API Endpoint
 * 
 * Processes pending notifications from the queue
 * Can be called by:
 * - Vercel Cron (scheduled)
 * - Manual trigger from admin panel
 * - External monitoring systems
 * 
 * Path: /api/cron/process-notifications
 * 
 * Vercel Cron configuration in vercel.json:
 * - Schedule: every 5 minutes (star-slash-5 space star space star space star space star)
 * - Actions: process (default), retry
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { organizationMembers } from '@/db/schema-organizations';
import { eq, and, or } from 'drizzle-orm';
import { 
  processPendingNotifications, 
  retryFailedNotifications 
} from '@/services/financial-service/src/services/notification-service';

export async function GET(request: NextRequest) {
  try {
    // Verify authorization
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // Allow Vercel Cron (with secret) or authenticated admin users
    const isVercelCron = authHeader === `Bearer ${cronSecret}`;
    
    if (!isVercelCron) {
      // Check if user is authenticated admin
      const { userId } = await auth();
      if (!userId) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      // Check if user has admin role in any organization
      const adminMemberships = await db
        .select({ role: organizationMembers.role })
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.userId, userId),
            eq(organizationMembers.status, 'active'),
            or(
              eq(organizationMembers.role, 'admin'),
              eq(organizationMembers.role, 'super_admin')
            )
          )
        )
        .limit(1);
      
      if (adminMemberships.length === 0) {
        return NextResponse.json(
          { error: 'Forbidden: Admin access required' },
          { status: 403 }
        );
      }
    }

    // Get action from query params
    const action = request.nextUrl.searchParams.get('action') || 'process';
    const batchSize = parseInt(request.nextUrl.searchParams.get('batchSize') || '50');

    if (action === 'retry') {
      // Retry failed notifications
      const maxAttempts = parseInt(request.nextUrl.searchParams.get('maxAttempts') || '3');
      console.log('[API] Retrying failed notifications...');
      const retried = await retryFailedNotifications(maxAttempts);
      
      return NextResponse.json({
        success: true,
        action: 'retry',
        retried,
        timestamp: new Date(),
      });
    }

    if (action === 'process') {
      // Process pending notifications
      console.log('[API] Processing pending notifications...');
      const processed = await processPendingNotifications(batchSize);
      
      return NextResponse.json({
        success: true,
        action: 'process',
        processed,
        timestamp: new Date(),
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use: process, retry' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[API] Error processing notifications:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
