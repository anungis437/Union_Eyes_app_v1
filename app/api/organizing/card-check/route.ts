import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * API Route: Card Check Validation
 * Validate organizing campaign card checks
 * Phase 3: Organizing & Certification
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { sql } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { z } from "zod";
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";

export const dynamic = 'force-dynamic';

export const POST = async (request: NextRequest) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
    const user = { id: context.userId, organizationId: context.organizationId };

  try {
      const body = await request.json();
      const { campaignId, validationDate } = body;

      if (!campaignId) {
        return NextResponse.json(
          { error: 'Bad Request - campaignId is required' },
          { status: 400 }
        );
      }

      const date = validationDate || new Date().toISOString().split('T')[0];

      // Call database function
      const result = await db.execute(
        sql`SELECT * FROM validate_card_check_threshold(${campaignId}::uuid, ${date}::date)`
      );

      const validation = result[0];

      return NextResponse.json({
        success: true,
        data: {        validationDate: date,
          isValid: validation?.is_valid || false,
          totalContacts: validation?.total_contacts || 0,
          cardsSigned: validation?.cards_signed || 0,
          supportPercentage: parseFloat(validation?.support_percentage as string || '0'),
          thresholdMet: validation?.threshold_met || false,
          requiredPercentage: parseFloat(validation?.required_percentage as string || '0'),
          validationMessage: validation?.validation_message || '',
        },
      });

    } catch (error) {
      logger.error('Failed to validate card check', error as Error, {      correlationId: request.headers.get('x-correlation-id'),
      });
      return NextResponse.json(
        { error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
    })(request);
};
