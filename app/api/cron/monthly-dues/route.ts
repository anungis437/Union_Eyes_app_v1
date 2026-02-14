/**
 * Monthly Dues Batch Processing API
 * Generates dues transactions for all active members
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { logger } from '@/lib/logger';

import { standardSuccessResponse } from '@/lib/api/standardized-responses';
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return standardErrorResponse(
      ErrorCode.AUTH_REQUIRED,
      'Unauthorized'
    );
    }

    const startDate = new Date();
    startDate.setDate(1); // First day of current month
    
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);
    endDate.setDate(0); // Last day of current month

    logger.info('Starting monthly dues batch processing', {
      periodStart: startDate.toISOString(),
      periodEnd: endDate.toISOString(),
    });

    // Call SQL function to create transactions for all active profiles
    const result = await db.execute(sql`
      SELECT create_monthly_dues_transaction(
        p.user_id,
        ${startDate.toISOString().split('T')[0]}::DATE,
        ${endDate.toISOString().split('T')[0]}::DATE
      ) as transaction_id
      FROM profiles p
      WHERE p.status = 'active'
    `);

    const transactionsCreated = Array.isArray(result) ? result.length : 0;

    logger.info('Monthly dues batch processing completed', {
      transactionsCreated,
      periodStart: startDate.toISOString(),
      periodEnd: endDate.toISOString(),
    });

    return NextResponse.json({
      success: true,
      transactionsCreated,
      periodStart: startDate.toISOString(),
      periodEnd: endDate.toISOString(),
    });
  } catch (error) {
    logger.error('Failed to process monthly dues batch', error as Error);
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Internal server error',
      error
    );
  }
}

