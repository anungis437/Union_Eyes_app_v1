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
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";

export const dynamic = 'force-dynamic';

export const POST = async (request: NextRequest) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
    const user = { id: context.userId, organizationId: context.organizationId };

  let body: any;
    try {
      body = await request.json();
      const { organizationId, tierName, checkDate } = body;
  if (organizationId && organizationId !== context.organizationId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }


      if (!organizationId || !tierName) {
        return NextResponse.json(
          { error: 'Bad Request - organizationId and tierName are required' },
          { status: 400 }
        );
      }

      const date = checkDate || new Date().toISOString().split('T')[0];

      // Call database function
      const result = await db.execute(
        sql`SELECT * FROM check_clc_tier_compliance(
        ${organizationId}::uuid, 
        ${tierName}::VARCHAR, 
        ${date}::date
      )`
      );

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
      return NextResponse.json(
        { error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
    })(request);
};
