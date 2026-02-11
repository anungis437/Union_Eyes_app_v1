/**
 * Scheduled Reports Cron Job
 * 
 * This endpoint is called by a cron service (e.g., Vercel Cron, GitHub Actions)
 * to execute scheduled reports that are due.
 * 
 * POST /api/cron/scheduled-reports
 * 
 * Part of: Phase 2.4 - Scheduled Reports System
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDueSchedules } from '@/db/queries/scheduled-reports-queries';
import { executeScheduledReport } from '@/lib/scheduled-report-executor';

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
/**
 * Execute all scheduled reports that are due
 */
export async function POST(req: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return standardErrorResponse(
      ErrorCode.AUTH_REQUIRED,
      'Unauthorized'
    );
    }
// Get all schedules that are due
    const dueSchedules = await getDueSchedules();

    if (dueSchedules.length === 0) {
return NextResponse.json({
        message: 'No schedules due',
        executed: 0,
      });
    }
// Execute each schedule
    const results = [];
    for (const schedule of dueSchedules) {
try {
        const result = await executeScheduledReport(schedule);
        results.push(result);
      } catch (error) {
results.push({
          success: false,
          scheduleId: schedule.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Count successes and failures
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;
return NextResponse.json({
      message: 'Execution complete',
      total: dueSchedules.length,
      succeeded: successCount,
      failed: failureCount,
      results,
    });
  } catch (error) {
return NextResponse.json(
      { 
        error: 'Failed to execute scheduled reports',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for health check
 */
export async function GET(req: NextRequest) {
  try {
    // Verify authorization
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return standardErrorResponse(
      ErrorCode.AUTH_REQUIRED,
      'Unauthorized'
    );
    }

    // Get count of due schedules without executing
    const dueSchedules = await getDueSchedules();

    return NextResponse.json({
      status: 'healthy',
      dueSchedules: dueSchedules.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
return NextResponse.json(
      { 
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

