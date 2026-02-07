import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * API Route: T4A Tax Slip Generation
 * Generate T4A slips for CRA compliance
 * Phase 1: Tax Compliance & Financial
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { sql } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { z } from "zod";
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";

export const dynamic = 'force-dynamic';

export const POST = async (request: NextRequest) => {
  return withEnhancedRoleAuth(60, async (request, context) => {
    const user = { id: context.userId, organizationId: context.organizationId };

  try {
      const body = await request.json();
      const { taxYear, organizationId } = body;
  if (organizationId && organizationId !== context.organizationId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }


      if (!taxYear || !organizationId) {
        return NextResponse.json(
          { error: 'Bad Request - taxYear and organizationId are required' },
          { status: 400 }
        );
      }

      // Validate tax year is a valid number
      const year = parseInt(taxYear);
      if (isNaN(year) || year < 2000 || year > 2100) {
        return NextResponse.json(
          { error: 'Bad Request - Invalid tax year' },
          { status: 400 }
        );
      }

      // Call database function to generate T4A records
      const result = await db.execute(
        sql`SELECT * FROM generate_t4a_records(${year}::integer, ${organizationId}::uuid)`
      );

      const t4aRecords = result as unknown as Array<{
        member_id: string;
        total_pension_payments: string;
        total_lump_sum_payments: string;
        income_tax_deducted: string;
        other_information: string;
      }>;

      return NextResponse.json({
        success: true,
        data: {
          taxYear: year,        recordCount: t4aRecords.length,
          records: t4aRecords.map((record) => ({
            memberId: record.member_id,
            totalPensionPayments: parseFloat(record.total_pension_payments || '0'),
            totalLumpSumPayments: parseFloat(record.total_lump_sum_payments || '0'),
            incomeTaxDeducted: parseFloat(record.income_tax_deducted || '0'),
            otherInformation: record.other_information,
          })),
        },
        message: `Generated ${t4aRecords.length} T4A records for tax year ${year}`,
      });

    } catch (error) {
      const body = await request.json();
      logger.error('Failed to generate T4A records', error as Error, {
        user.id: (await auth()).user.id,
        taxYear: body.taxYear,
        organizationId: body.organizationId,
        correlationId: request.headers.get('x-correlation-id'),
  });
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
  })(request);
};
