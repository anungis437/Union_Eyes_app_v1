import { withRLSContext } from '@/lib/db/with-rls-context';
import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * API Route: CLC Tier Compliance Check
 * Check compliance with Canada Labour Code tier requirements
 * CLC Compliance & Jurisdiction Management
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { sql } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { z } from "zod";
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
export const dynamic = 'force-dynamic';

const jurisdictionClcComplianceSchema = z.object({
  organizationId: z.string().uuid('Invalid organizationId'),
  tierName: z.string().min(1, 'tierName is required'),
  checkDate: z.string().datetime().optional(),
});

export const POST = async (request: NextRequest) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
    const user = { id: context.userId, organizationId: context.organizationId };

  let body: any;
    try {
      body = await request.json();
      const { organizationId, tierName, checkDate } = body;
  if (organizationId && organizationId !== context.organizationId) {
    return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Forbidden'
    );
  }


      if (!organizationId || !tierName) {
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Bad Request - organizationId and tierName are required'
    );
      }

      const date = checkDate || new Date().toISOString().split('T')[0];

      // Call database function
      const result = await withRLSContext(async (tx) => {
      return await tx.execute(
        sql`SELECT * FROM check_clc_tier_compliance(
        ${organizationId}::uuid, 
        ${tierName}::VARCHAR, 
        ${date}::date
      )`
      );
    });

      const compliance = result[0];

      return NextResponse.json({
        success: true,
        data: {        tierName,
          checkDate: date,
          isCompliant: compliance?.is_compliant || false,
          minimumMembersRequired: compliance?.minimum_members_required || 0,
          actualMemberCount: compliance?.actual_member_count || 0,
          complianceGap: compliance?.compliance_gap || 0,
          complianceMessage: compliance?.compliance_message || '',
        },
      });

    } catch (error) {
      logger.error('Failed to check CLC tier compliance', error as Error, {      organizationId: body?.organizationId,
        tierName: body?.tierName,
        correlationId: request.headers.get('x-correlation-id'),
      });
      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Internal Server Error',
      error
    );
    }
    })(request);
};

