import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * API Route: Jurisdiction Deadline Validation
 * Validate deadlines against jurisdiction rules
 * CLC Compliance & Jurisdiction Management
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

  let body: any;
    try {
      body = await request.json();
      const { jurisdictionId, actionType, proposedDate, eventDate } = body;

      if (!jurisdictionId || !actionType || !proposedDate || !eventDate) {
        return NextResponse.json(
          { error: 'Bad Request - jurisdictionId, actionType, proposedDate, and eventDate are required' },
          { status: 400 }
        );
      }

      // Call database function
      const result = await db.execute(
        sql`SELECT * FROM validate_jurisdiction_deadline(
        ${jurisdictionId}::uuid, 
        ${actionType}::VARCHAR, 
        ${proposedDate}::date, 
        ${eventDate}::date
      )`
      );

      const validation = result[0];

      return NextResponse.json({
        success: true,
        data: {
          jurisdictionId,
          actionType,
          proposedDate,
          eventDate,
          isValid: validation?.is_valid || false,
          requiredNoticeDays: validation?.required_notice_days || 0,
          actualNoticeDays: validation?.actual_notice_days || 0,
          deadlineDate: validation?.deadline_date || null,
          validationMessage: validation?.validation_message || '',
        },
      });

    } catch (error) {
      logger.error('Failed to validate jurisdiction deadline', error as Error, {      jurisdictionId: body?.jurisdictionId,
        correlationId: request.headers.get('x-correlation-id'),
      });
      return NextResponse.json(
        { error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  })
  })(request);
};
