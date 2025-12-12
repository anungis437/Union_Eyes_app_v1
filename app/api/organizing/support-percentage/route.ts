/**
 * API Route: Campaign Support Percentage
 * Calculate support percentage for organizing campaigns
 * Phase 3: Organizing & Certification
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db/db';
import { sql } from 'drizzle-orm';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * POST /api/organizing/support-percentage
 * Calculate support percentage for a campaign
 * Uses the calculate_support_percentage database function
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { campaignId, asOfDate } = body;

    if (!campaignId) {
      return NextResponse.json(
        { error: 'Bad Request - campaignId is required' },
        { status: 400 }
      );
    }

    const date = asOfDate || new Date().toISOString().split('T')[0];

    // Call database function
    const result = await db.execute(
      sql`SELECT calculate_support_percentage(${campaignId}::uuid, ${date}::date) as support_percentage`
    );

    const supportPercentage = result[0]?.support_percentage;

    return NextResponse.json({
      success: true,
      data: {        asOfDate: date,
        supportPercentage: supportPercentage ? parseFloat(supportPercentage as string) : 0,
      },
    });

  } catch (error) {
    logger.error('Failed to calculate support percentage', error as Error, {      correlationId: request.headers.get('x-correlation-id'),
    });
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
