import { NextRequest, NextResponse } from 'next/server';
import { currencyEnforcementService } from '@/services/currency-enforcement-service';

/**
 * T106 Filing API
 * Information Return of Non-Arm's Length Transactions with Non-Residents
 */

// POST /api/tax/t106/check
// Check if transaction requires T106 filing
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, currency, counterpartyCountry, isRelatedParty, transactionDate } = body;

    if (!amount || !counterpartyCountry) {
      return NextResponse.json(
        { error: 'Missing required fields: amount, counterpartyCountry' },
        { status: 400 }
      );
    }

    const check = await currencyEnforcementService.checkT106Requirement({
      amount,
      currency: currency || 'CAD',
      counterpartyCountry,
      isRelatedParty: isRelatedParty || false,
      transactionDate: transactionDate ? new Date(transactionDate) : new Date(),
    });

    return NextResponse.json(check);
  } catch (error) {
    console.error('T106 check error:', error);
    return NextResponse.json(
      { error: 'T106 check failed' },
      { status: 500 }
    );
  }
}

// GET /api/tax/t106/status?taxYear=2025
// Get T106 filing status
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const taxYearStr = searchParams.get('taxYear');
    const taxYear = taxYearStr ? parseInt(taxYearStr) : undefined;

    const status = await currencyEnforcementService.getT106FilingStatus(taxYear);

    return NextResponse.json({
      filings: status,
      count: status.length,
    });
  } catch (error) {
    console.error('T106 status error:', error);
    return NextResponse.json(
      { error: 'Failed to get T106 status' },
      { status: 500 }
    );
  }
}
