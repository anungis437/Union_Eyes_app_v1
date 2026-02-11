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
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { checkRateLimit, RATE_LIMITS, createRateLimitHeaders } from '@/lib/rate-limiter';

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
export const dynamic = 'force-dynamic';


const taxT4aSchema = z.object({
  taxYear: z.unknown().optional(),
  organizationId: z.string().uuid('Invalid organizationId'),
});

export const POST = async (request: NextRequest) => {
  return withRoleAuth('steward', async (request, context) => {
    const { userId, organizationId: contextOrganizationId } = context;

  try {
      // Rate limiting: 10 tax operations per hour per user
      const rateLimitResult = await checkRateLimit(userId, RATE_LIMITS.TAX_OPERATIONS);
      if (!rateLimitResult.allowed) {
        return NextResponse.json(
          { 
            error: 'Rate limit exceeded. Too many tax requests.',
            resetIn: rateLimitResult.resetIn 
          },
          { 
            status: 429,
            headers: createRateLimitHeaders(rateLimitResult),
          }
        );
      }

      const body = await request.json();
    // Validate request body
    const validation = taxT4aSchema.safeParse(body);
    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request data',
        validation.error.errors
      );
    }
    
    const { taxYear, organizationId } = validation.data;
      const { taxYear, organizationId } = body;
  if (organizationId && organizationId !== contextOrganizationId) {
    return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Forbidden'
    );
  }


      if (!taxYear || !organizationId) {
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Bad Request - taxYear and organizationId are required'
    );
      }

      // Validate tax year is a valid number
      const year = parseInt(taxYear);
      if (isNaN(year) || year < 2000 || year > 2100) {
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Bad Request - Invalid tax year'
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
        userId: userId,
        taxYear: body.taxYear,
        organizationId: body.organizationId,
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

