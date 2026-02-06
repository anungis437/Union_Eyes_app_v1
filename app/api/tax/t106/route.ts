import { NextRequest, NextResponse } from 'next/server';
import {
  checkStrikePaymentTaxability,
  generateT4A,
  generateRL1,
  getT4AFilingDeadline,
} from '@/lib/services/strike-fund-tax-service';
import type { T106FilingRequest, T106FilingResponse } from '@/lib/types/compliance-api-types';

/**
 * T106 Filing API / T4A / RL-1 Generation
 * Information Return of Non-Arm's Length Transactions with Non-Residents
 * Also handles T4A (Canadian strike payments) and RL-1 (Quebec tax slips)
 */

/**
 * POST /api/tax/t106
 * Check if strike payment requires T106 filing and generate tax slips
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as T106FilingRequest;
    const { memberId, taxYear, strikePayments, province } = body;

    // Validate required fields
    if (!memberId || !taxYear || !strikePayments || strikePayments.length === 0) {
      return NextResponse.json(
        {
          success: false,
          requiresT106: false,
          error: 'Missing required fields: memberId, taxYear, strikePayments (array)',
        } as T106FilingResponse,
        { status: 400 }
      );
    }

    // Calculate total strike payments
    const totalAmount = strikePayments.reduce((sum, p) => sum + p.amount, 0);

    // Check if payments require T106
    const t106Check = checkStrikePaymentTaxability({
      paymentYear: taxYear,
      totalAmount,
      paymentDates: strikePayments.map(p => new Date(p.date)),
      isCanadianResident: true,
    });

    // Generate T4A for all strike payments
    const t4a = generateT4A(memberId, taxYear, totalAmount);

    // Generate RL-1 if Quebec
    let rl1 = null;
    if (province?.toUpperCase() === 'QC') {
      rl1 = generateRL1(memberId, taxYear, totalAmount);
    }

    // Get filing deadline
    const deadline = getT4AFilingDeadline(taxYear);

    return NextResponse.json({
      success: true,
      requiresT106: t106Check.requires,
      filing: {
        slipNumber: t4a.slipNumber,
        taxYear,
        payerName: 'Union Fund',
        recipientName: `Member ${memberId}`,
        amount: totalAmount,
        boxes: {
          'Box 14': totalAmount, // Strike pay
          'Box 16': 0, // Taxable amount (same as Box 14 for strike pay)
        },
        filingDeadline: deadline,
        requiresElectronicFiling: true,
      },
      rl1Details: rl1 ? {
        province: 'QC',
        deadline: rl1.filingDeadline,
        slipFormat: 'RL-1',
      } : undefined,
      message: `T4A generated for ${taxYear}. Deadline: ${deadline}`,
    } as T106FilingResponse);
  } catch (error) {
    console.error('T106/T4A generation error:', error);
    return NextResponse.json(
      {
        success: false,
        requiresT106: false,
        error: `T106/T4A generation failed: ${error}`,
      } as T106FilingResponse,
      { status: 500 }
    );
  }
}

/**
 * GET /api/tax/t106?taxYear=2025&memberId=123
 * Get T106 filing status and details
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const taxYearStr = searchParams.get('taxYear');
    const memberId = searchParams.get('memberId');

    if (!taxYearStr) {
      return NextResponse.json(
        {
          success: false,
          requiresT106: false,
          error: 'taxYear parameter required',
        } as T106FilingResponse,
        { status: 400 }
      );
    }

    const taxYear = parseInt(taxYearStr);
    const deadline = getT4AFilingDeadline(taxYear);

    return NextResponse.json({
      success: true,
      requiresT106: taxYear >= 2024, // T4A required from 2024 onwards for strike payments
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
    console.error('T106 status error:', error);
    return NextResponse.json(
      {
        success: false,
        requiresT106: false,
        error: `Failed to get T106 status: ${error}`,
      } as T106FilingResponse,
      { status: 500 }
    );
  }
}
  }
}
