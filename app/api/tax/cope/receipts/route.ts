import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * API Route: COPE Receipts
 * Political contribution receipts for union members
 * Phase 2: CRA Tax Compliance
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { copeContributions, members } from '@/db/migrations/schema';
import { eq, and, desc, gte, lte, sql } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { z } from "zod";
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";
import { checkRateLimit, RATE_LIMITS, createRateLimitHeaders } from '@/lib/rate-limiter';

export const dynamic = 'force-dynamic';

export const GET = async (request: NextRequest) => {
  return withEnhancedRoleAuth(60, async (request, context) => {
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

      const { searchParams } = new URL(request.url);
      const memberId = searchParams.get('memberId');
      const taxYear = parseInt(searchParams.get('taxYear') || new Date().getFullYear().toString());
      const format = searchParams.get('format') || 'json'; // 'json' | 'pdf'

      if (!memberId) {
        return NextResponse.json(
          { error: 'Bad Request - memberId is required' },
          { status: 400 }
        );
      }

      // Verify member exists
      const member = await db
        .select()
        .from(members)
        .where(eq(members.id, memberId))
        .limit(1);

      if (!member || member.length === 0) {
        return NextResponse.json(
          { error: 'Not Found - Member not found' },
          { status: 404 }
        );
      }

      // Query COPE contributions for the tax year
      // Filter by year using SQL EXTRACT
      const contributions = await db
        .select()
        .from(copeContributions)
        .where(
          and(
            eq(copeContributions.memberId, memberId),
            sql`EXTRACT(YEAR FROM ${copeContributions.contributionDate}) = ${taxYear}`
          )
        )
        .orderBy(desc(copeContributions.contributionDate));

      // Calculate total (using politicalPortion as the tax-deductible amount)
      const totalAmount = contributions.reduce(
        (sum, contrib) => sum + Number(contrib.politicalPortion || 0),
        0
      );

      // Get summary by contribution type
      const summary = contributions.reduce((acc, contrib) => {
        const type = contrib.contributionType || 'other';
        if (!acc[type]) {
          acc[type] = { count: 0, total: 0 };
        }
        acc[type].count += 1;
        acc[type].total += Number(contrib.politicalPortion || 0);
        return acc;
      }, {} as Record<string, { count: number; total: number }>);

      const response = {
        success: true,
        data: {
          memberId,
          memberName: `${member[0].firstName} ${member[0].lastName}`,
          taxYear,
          totalContributions: totalAmount.toFixed(2),
          contributionCount: contributions.length,
          summary,
          contributions,
          receiptGenerated: new Date().toISOString(),
          taxDeductionNotice: 'COPE contributions may be tax-deductible. Consult your tax advisor.',
        },
      };

      // If PDF format requested, generate PDF (future enhancement)
      if (format === 'pdf') {
        return NextResponse.json({
          error: 'Not Implemented - PDF format not yet available',
          fallback: response,
        }, { status: 501 });
      }

      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: '/api/tax/cope/receipts',
        method: 'GET',
        eventType: 'success',
        severity: 'medium',
        details: {
          dataType: 'FINANCIAL',
          memberId,
          taxYear,
          totalAmount,
          contributionCount: contributions.length,
        },
      });

      return NextResponse.json(response);

    } catch (error) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: '/api/tax/cope/receipts',
        method: 'GET',
        eventType: 'server_error',
        severity: 'high',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      });
      logger.error('Failed to fetch COPE receipts', error as Error, {
        userId: userId,
        memberId: request.nextUrl.searchParams.get('memberId'),
        taxYear: request.nextUrl.searchParams.get('taxYear'),
        correlationId: request.headers.get('x-correlation-id'),
  });
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
  })(request);
};

export const POST = async (request: NextRequest) => {
  return withEnhancedRoleAuth(60, async (request, context) => {
    const { userId, organizationId: contextOrganizationId } = context;

  try {
      const body = await request.json();
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
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }


      // Validate required fields
      if (!memberId || !organizationId || !contributionDate || !totalAmount || !politicalPortion || !administrativePortion) {
        return NextResponse.json(
          { error: 'Bad Request - memberId, organizationId, contributionDate, totalAmount, politicalPortion, and administrativePortion are required' },
          { status: 400 }
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
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
  })(request);
};
