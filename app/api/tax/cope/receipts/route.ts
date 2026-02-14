import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * API Route: COPE Receipts
 * Political contribution receipts for union members
 * Phase 2: CRA Tax Compliance
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { copeContributions, members } from '@/db/schema';
import { and, desc } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { z } from "zod";
import { withApiAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { checkRateLimit, RATE_LIMITS, createRateLimitHeaders } from '@/lib/rate-limiter';

import { standardSuccessResponse } from '@/lib/api/standardized-responses';
export const dynamic = 'force-dynamic';

export const GET = async (request: NextRequest) => {
  return withRoleAuth('steward', async (request, context) => {
    const { userId } = context;

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

      // DUPLICATE REMOVED:       const { searchParams } = new URL(request.url);
      // DUPLICATE REMOVED:       const memberId = searchParams.get('memberId');
      // DUPLICATE REMOVED:       const taxYear = parseInt(searchParams.get('taxYear') || new Date().getFullYear().toString());
      // DUPLICATE REMOVED:       const format = searchParams.get('format') || 'json'; // 'json' | 'pdf'
      // DUPLICATE REMOVED: 
      // DUPLICATE REMOVED:       if (!memberId) {
      // DUPLICATE REMOVED:         return standardErrorResponse(
      // DUPLICATE REMOVED:       ErrorCode.MISSING_REQUIRED_FIELD,
      // DUPLICATE REMOVED:       'Bad Request - memberId is required'
      // DUPLICATE REMOVED:     );
      // DUPLICATE REMOVED:       }
      // DUPLICATE REMOVED: 
      // DUPLICATE REMOVED:       // Verify member exists
      // DUPLICATE REMOVED:       const member = await db
      // DUPLICATE REMOVED:         .select()
      // DUPLICATE REMOVED:         .from(members)
      // DUPLICATE REMOVED:         .where(eq(members.id, memberId))
      // DUPLICATE REMOVED:         .limit(1);
      // DUPLICATE REMOVED: 
      // DUPLICATE REMOVED:       if (!member || member.length === 0) {
      // DUPLICATE REMOVED:         return standardErrorResponse(
      // DUPLICATE REMOVED:       ErrorCode.RESOURCE_NOT_FOUND,
      // DUPLICATE REMOVED:       'Not Found - Member not found'
      // DUPLICATE REMOVED:     );
      // DUPLICATE REMOVED:       }
      // DUPLICATE REMOVED: 
      // DUPLICATE REMOVED:       // Query COPE contributions for the tax year
      // DUPLICATE REMOVED:       // Filter by year using SQL EXTRACT
      // DUPLICATE REMOVED:       const contributions = await db
      // DUPLICATE REMOVED:         .select()
      // DUPLICATE REMOVED:         .from(copeContributions)
      // DUPLICATE REMOVED:         .where(
      // DUPLICATE REMOVED:           and(
      // DUPLICATE REMOVED:             eq(copeContributions.memberId, memberId),
      // DUPLICATE REMOVED:             sql`EXTRACT(YEAR FROM ${copeContributions.contributionDate}) = ${taxYear}`
      // DUPLICATE REMOVED:           )
      // DUPLICATE REMOVED:         )
      // DUPLICATE REMOVED:         .orderBy(desc(copeContributions.contributionDate));
      // DUPLICATE REMOVED: 
      // DUPLICATE REMOVED:       // Calculate total (using politicalPortion as the tax-deductible amount)
      // DUPLICATE REMOVED:       const totalAmount = contributions.reduce(
      // DUPLICATE REMOVED:         (sum, contrib) => sum + Number(contrib.politicalPortion || 0),
      // DUPLICATE REMOVED:         0
      // DUPLICATE REMOVED:       );
      // DUPLICATE REMOVED: 
      // DUPLICATE REMOVED:       // Get summary by contribution type
      // DUPLICATE REMOVED:       const summary = contributions.reduce((acc, contrib) => {
      // DUPLICATE REMOVED:         const type = contrib.contributionType || 'other';
      // DUPLICATE REMOVED:         if (!acc[type]) {
      // DUPLICATE REMOVED:           acc[type] = { count: 0, total: 0 };
      // DUPLICATE REMOVED:         }
      // DUPLICATE REMOVED:         acc[type].count += 1;
      // DUPLICATE REMOVED:         acc[type].total += Number(contrib.politicalPortion || 0);
      // DUPLICATE REMOVED:         return acc;
      // DUPLICATE REMOVED:       }, {} as Record<string, { count: number; total: number }>);
      // DUPLICATE REMOVED: 
      // DUPLICATE REMOVED:       const response = {
      // DUPLICATE REMOVED:         success: true,
      // DUPLICATE REMOVED:         data: {
      // DUPLICATE REMOVED:           memberId,
      // DUPLICATE REMOVED:           memberName: `${member[0].firstName} ${member[0].lastName}`,
      // DUPLICATE REMOVED:           taxYear,
      // DUPLICATE REMOVED:           totalContributions: totalAmount.toFixed(2),
      // DUPLICATE REMOVED:           contributionCount: contributions.length,
      // DUPLICATE REMOVED:           summary,
      // DUPLICATE REMOVED:           contributions,
      // DUPLICATE REMOVED:           receiptGenerated: new Date().toISOString(),
      // DUPLICATE REMOVED:           taxDeductionNotice: 'COPE contributions may be tax-deductible. Consult your tax advisor.',
      // DUPLICATE REMOVED:         },
      // DUPLICATE REMOVED:       };
      // DUPLICATE REMOVED: 
      // DUPLICATE REMOVED:       // If PDF format requested, generate PDF (future enhancement)
      // DUPLICATE REMOVED:       if (format === 'pdf') {
      // DUPLICATE REMOVED:         return NextResponse.json({
      // DUPLICATE REMOVED:           error: 'Not Implemented - PDF format not yet available',
      // DUPLICATE REMOVED:           fallback: response,
      // DUPLICATE REMOVED:         }, { status: 501 });
      // DUPLICATE REMOVED:       }
      // DUPLICATE REMOVED: 
      // DUPLICATE REMOVED:       logApiAuditEvent({
      // DUPLICATE REMOVED:         timestamp: new Date().toISOString(),
      // DUPLICATE REMOVED:         userId,
      // DUPLICATE REMOVED:         endpoint: '/api/tax/cope/receipts',
      // DUPLICATE REMOVED:         method: 'GET',
      // DUPLICATE REMOVED:         eventType: 'success',
      // DUPLICATE REMOVED:         severity: 'medium',
      // DUPLICATE REMOVED:         details: {
      // DUPLICATE REMOVED:           dataType: 'FINANCIAL',
      // DUPLICATE REMOVED:           memberId,
      // DUPLICATE REMOVED:           taxYear,
      // DUPLICATE REMOVED:           totalAmount,
      // DUPLICATE REMOVED:           contributionCount: contributions.length,
      // DUPLICATE REMOVED:         },
      // DUPLICATE REMOVED:       });
      // DUPLICATE REMOVED: 
      // DUPLICATE REMOVED:       return NextResponse.json(response);
      // DUPLICATE REMOVED: 
      // DUPLICATE REMOVED:     } catch (error) {
      // DUPLICATE REMOVED:       logApiAuditEvent({
      // DUPLICATE REMOVED:         timestamp: new Date().toISOString(),
      // DUPLICATE REMOVED:         userId,
      // DUPLICATE REMOVED:         endpoint: '/api/tax/cope/receipts',
      // DUPLICATE REMOVED:         method: 'GET',
      // DUPLICATE REMOVED:         eventType: 'server_error',
      // DUPLICATE REMOVED:         severity: 'high',
      // DUPLICATE REMOVED:         details: { error: error instanceof Error ? error.message : 'Unknown error' },
      // DUPLICATE REMOVED:       });
      // DUPLICATE REMOVED:       logger.error('Failed to fetch COPE receipts', error as Error, {
      // DUPLICATE REMOVED:         userId: userId,
      // DUPLICATE REMOVED:         memberId: request.nextUrl.searchParams.get('memberId'),
      // DUPLICATE REMOVED:         taxYear: request.nextUrl.searchParams.get('taxYear'),
      // DUPLICATE REMOVED:         correlationId: request.headers.get('x-correlation-id'),
      // DUPLICATE REMOVED:   });
      // DUPLICATE REMOVED:     return standardErrorResponse(
      // DUPLICATE REMOVED:       ErrorCode.INTERNAL_ERROR,
      // DUPLICATE REMOVED:       'Internal Server Error',
      // DUPLICATE REMOVED:       error
      // DUPLICATE REMOVED:     );
      // DUPLICATE REMOVED:   }
      // DUPLICATE REMOVED:   })(request);
      // DUPLICATE REMOVED: };
      // DUPLICATE REMOVED: 
      // DUPLICATE REMOVED: 
      // DUPLICATE REMOVED: const taxCopeReceiptsSchema = z.object({
      // DUPLICATE REMOVED:   memberId: z.string().uuid('Invalid memberId'),
      // DUPLICATE REMOVED:   organizationId: z.string().uuid('Invalid organizationId'),
      // DUPLICATE REMOVED:   contributionDate: z.string().datetime().optional(),
      // DUPLICATE REMOVED:   totalAmount: z.number().positive('totalAmount must be positive'),
      // DUPLICATE REMOVED:   politicalPortion: z.unknown().optional(),
      // DUPLICATE REMOVED:   administrativePortion: z.boolean().optional(),
      // DUPLICATE REMOVED:   contributionType: z.unknown().optional().default('payroll_deduction'),
      // DUPLICATE REMOVED:   paymentMethod: z.unknown().optional(),
      // DUPLICATE REMOVED:   paymentReference: z.unknown().optional(),
      // DUPLICATE REMOVED:   isEligibleForCredit: z.boolean().optional().default(true),
      // DUPLICATE REMOVED:   receiptIssued: z.boolean().optional().default(true),
      // DUPLICATE REMOVED:   receiptIssuedDate: z.boolean().optional(),
      // DUPLICATE REMOVED:   notes: z.string().optional(),
      // DUPLICATE REMOVED: });
      // DUPLICATE REMOVED: 
      // DUPLICATE REMOVED: export const POST = async (request: NextRequest) => {
      // DUPLICATE REMOVED:   return withRoleAuth('steward', async (request, context) => {
      // DUPLICATE REMOVED:     const { userId, organizationId: contextOrganizationId } = context;
      // DUPLICATE REMOVED: 
      // DUPLICATE REMOVED:   try {
      // DUPLICATE REMOVED:       const body = await request.json();
      // DUPLICATE REMOVED:     // Validate request body
      // DUPLICATE REMOVED:     const validation = taxCopeReceiptsSchema.safeParse(body);
      // DUPLICATE REMOVED:     if (!validation.success) {
      // DUPLICATE REMOVED:       return standardErrorResponse(
      // DUPLICATE REMOVED:         ErrorCode.VALIDATION_ERROR,
      // DUPLICATE REMOVED:         'Invalid request data',
      // DUPLICATE REMOVED:         validation.error.errors
      // DUPLICATE REMOVED:       );
      // DUPLICATE REMOVED:     }
      // DUPLICATE REMOVED:     
      // DUPLICATE REMOVED:     const { memberId, organizationId, contributionDate, totalAmount, politicalPortion, administrativePortion, contributionType = 'payroll_deduction', paymentMethod, paymentReference, isEligibleForCredit = true, receiptIssued = true, receiptIssuedDate, notes } = validation.data;
      const {
        memberId,
        organizationId,
        contributionDate,
        totalAmount,
        politicalPortion,
        administrativePortion,
        contributionType = 'payroll_deduction',
        paymentMethod,
        paymentReference,
        isEligibleForCredit = true,
        receiptIssued = true,
        receiptIssuedDate,
        notes,
      } = body;
  if (organizationId && organizationId !== contextOrganizationId) {
    return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Forbidden'
    );
  }


      // Validate required fields
      if (!memberId || !organizationId || !contributionDate || !totalAmount || !politicalPortion || !administrativePortion) {
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Bad Request - memberId, organizationId, contributionDate, totalAmount, politicalPortion, and administrativePortion are required'
    );
      }

      // Insert contribution
      const result = await db
        .insert(copeContributions)
        .values({
          memberId,
          organizationId,
          contributionDate: new Date(contributionDate).toISOString().split('T')[0],
          totalAmount: Number(totalAmount),
          politicalPortion: Number(politicalPortion),
          administrativePortion: Number(administrativePortion),
          contributionType,
          paymentMethod: paymentMethod || null,
          paymentReference: paymentReference || null,
          isEligibleForCredit,
          receiptIssued,
          receiptIssuedDate: receiptIssuedDate ? new Date(receiptIssuedDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          notes: notes || null,
        })
        .returning();

      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: '/api/tax/cope/receipts',
        method: 'POST',
        eventType: 'success',
        severity: 'high',
        details: {
          dataType: 'FINANCIAL',
          memberId,
          organizationId,
          totalAmount: Number(totalAmount),
          politicalPortion: Number(politicalPortion),
        },
      });

      return NextResponse.json({
        success: true,
        data: result[0],
        message: 'COPE contribution recorded successfully',
      });

    } catch (error) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: '/api/tax/cope/receipts',
        method: 'POST',
        eventType: 'server_error',
        severity: 'high',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      });
      logger.error('Failed to record COPE contribution', error as Error, {
        userId: userId,
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

