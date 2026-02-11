import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * API Route: Campaign Support Percentage
 * Calculate support percentage for organizing campaigns
 * Phase 3: Organizing & Certification
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { sql } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { z } from "zod";
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';

export const dynamic = 'force-dynamic';

export const POST = async (request: NextRequest) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
  try {
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
    })(request);
};

