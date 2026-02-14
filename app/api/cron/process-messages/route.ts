/**
 * Message Queue Processor API Endpoint
 * 
 * Triggers the background message queue processor
 * Can be called by:
 * - Vercel Cron (scheduled)
 * - Manual trigger from admin panel
 * - External monitoring systems
 * 
 * Path: /api/cron/process-messages
 * 
 * Phase 4: Communications & Organizing
 * 
 * To enable Vercel Cron, add to vercel.json:
 * ```json
 * {
 *   "crons": [{
 *     "path": "/api/cron/process-messages",
 *     "schedule": "* * * * *"
 *   }]
 * }
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { organizationMembers } from '@/db/schema-organizations';
import { eq, and, or } from 'drizzle-orm';
import { processMessageQueue, getQueueStatus } from '@/lib/workers/message-queue-processor';
import { logger } from '@/lib/logger';

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

    if (action === 'status') {
      // Return queue status
      const status = await getQueueStatus();
      return NextResponse.json(status);
    }

    if (action === 'process') {
      // Process the message queue
      logger.info('[API] Starting message queue processing...');
      const stats = await processMessageQueue();
      
      return NextResponse.json({
        success: true,
        stats,
        timestamp: new Date(),
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use ?action=process or ?action=status' },
      { status: 400 }
    );

  } catch (error) {
    logger.error('[API] Message queue processing error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to process message queue',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request);
}
