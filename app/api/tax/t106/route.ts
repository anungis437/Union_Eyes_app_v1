import { NextRequest, NextResponse } from 'next/server';
import {
  checkStrikePaymentTaxability,
  generateT4A,
  generateRL1,
  getTaxFilingStatus,
} from '@/lib/services/strike-fund-tax-service';
import type { T106FilingRequest, T106FilingResponse } from '@/lib/types/compliance-api-types';
import { withEnhancedRoleAuth } from '@/lib/enterprise-role-middleware';
import { z } from 'zod';
import { logApiAuditEvent } from '@/lib/middleware/api-security';
import { checkRateLimit, RATE_LIMITS, createRateLimitHeaders } from '@/lib/rate-limiter';

/**
 * T106 Filing API / T4A / RL-1 Generation
 * Information Return of Non-Arm's Length Transactions with Non-Residents
 * Also handles T4A (Canadian strike payments) and RL-1 (Quebec tax slips)
 */

/**
 * POST /api/tax/t106
 * Check if strike payment requires T106 filing and generate tax slips
 */
const t106RequestSchema = z.object({
  memberId: z.string().uuid(),
  taxYear: z.number().int().min(2000).max(2100),
  strikePayments: z.array(z.object({
    amount: z.number().positive(),
  })).min(1),
  province: z.string().length(2).regex(/^[A-Za-z]{2}$/).optional(),
});

export const POST = withEnhancedRoleAuth(60, async (request, context) => {
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

    const body = await request.json();
    const parsed = t106RequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          requiresT106: false,
          error: 'Invalid request body',
        } as T106FilingResponse,
        { status: 400 }
      );
    }

    const { memberId, taxYear, strikePayments, province } = parsed.data;

    // Calculate total strike payments
    const totalAmount = strikePayments.reduce((sum, p) => sum + p.amount, 0);

    // Check if payments require T106
    const t106Check = await checkStrikePaymentTaxability(memberId, totalAmount);

    // Generate T4A for all strike payments
    const t4a = await generateT4A(memberId, taxYear);

    // Generate RL-1 if Quebec
    let rl1 = null;
    if (province?.toUpperCase() === 'QC') {
      rl1 = await generateRL1(memberId, taxYear);
    }

    // Get filing deadline
    const status = await getTaxFilingStatus(memberId, taxYear);
    const deadline = status.deadline.toISOString().split('T')[0];

    logApiAuditEvent({
      timestamp: new Date().toISOString(),
      userId: parsed.data.memberId,
      endpoint: '/api/tax/t106',
      method: 'POST',
      eventType: 'success',
      severity: 'high',
      details: {
        dataType: 'FINANCIAL',
        memberId: parsed.data.memberId,
        taxYear,
        totalAmount,
        requiresT106: t106Check.requiresT4A,
      },
    });

    return NextResponse.json({
      success: true,
      requiresT106: t106Check.requiresT4A,
      filing: {
        slipNumber: t4a.slipType,
        taxYear,
        payerName: 'Union Fund',
        recipientName: `Member ${memberId}`,
        amount: totalAmount,
        boxes: {
          'Box 028': totalAmount, // Strike pay (Box 028: Other Income)
          'Box 016': totalAmount, // Taxable amount
        },
        filingDeadline: deadline,
        requiresElectronicFiling: true,
      },
      rl1Details: rl1 ? {
        province: 'QC',
        deadline: deadline,
        slipFormat: 'RL-1',
      } : undefined,
      message: `T4A generated for ${taxYear}. Deadline: ${deadline}`,
    } as T106FilingResponse);
  } catch (error) {
    logApiAuditEvent({
      timestamp: new Date().toISOString(),
      userId: '',
      endpoint: '/api/tax/t106',
      method: 'POST',
      eventType: 'server_error',
      severity: 'high',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
    });
    console.error('T106/T4A generation error:', error);
    return NextResponse.json(
      {
        success: false,
        requiresT106: false,
        error: 'T106/T4A generation failed',
      } as T106FilingResponse,
      { status: 500 }
    );
  }
});

/**
 * GET /api/tax/t106?taxYear=2025&memberId=123
 * Get T106 filing status and details
 */
const t106QuerySchema = z.object({
  taxYear: z.coerce.number().int().min(2000).max(2100),
  memberId: z.string().uuid().optional(),
});

export const GET = withEnhancedRoleAuth(60, async (request) => {
  try {
    const query = t106QuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams)
    );

    if (!query.success) {
      return NextResponse.json(
        {
          success: false,
          requiresT106: false,
          error: 'Invalid request parameters',
        } as T106FilingResponse,
        { status: 400 }
      );
    }

    const { taxYear, memberId } = query.data;
    const deadline = new Date(`${taxYear + 1}-02-28`).toISOString().split('T')[0];

    logApiAuditEvent({
      timestamp: new Date().toISOString(),
      userId: memberId || '',
      endpoint: '/api/tax/t106',
      method: 'GET',
      eventType: 'success',
      severity: 'low',
      details: {
        dataType: 'FINANCIAL',
        taxYear,
        memberId,
      },
    });

    return NextResponse.json({
      success: true,
      requiresT106: taxYear >= 2024,
      message: `T4A filing status for tax year ${taxYear}`,
      filingDeadline: deadline,
      requiredSlips: memberId ? ['T4A'] : ['T4A', 'RL-1 (Quebec)'],
      notes: [
        'Strike payments over $500 require T4A reporting',
        'Quebec requires RL-1 for provincial compliance',
        'Electronic filing mandatory after 2024',
        `Members must receive slips by ${deadline}`,
      ],
    } as T106FilingResponse);
  } catch (error) {
    logApiAuditEvent({
      timestamp: new Date().toISOString(),
      userId: '',
      endpoint: '/api/tax/t106',
      method: 'GET',
      eventType: 'server_error',
      severity: 'high',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
    });
    console.error('T106 status error:', error);
    return NextResponse.json(
      {
        success: false,
        requiresT106: false,
        error: 'Failed to get T106 status',
      } as T106FilingResponse,
      { status: 500 }
    );
  }
});
