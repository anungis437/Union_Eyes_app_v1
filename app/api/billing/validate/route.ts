import { NextRequest, NextResponse } from 'next/server';
import { currencyEnforcementService } from '@/services/currency-enforcement-service';

/**
 * Currency Enforcement API
 * Enforces CAD-only billing per CRA transfer pricing rules
 */

// POST /api/billing/validate
// Validate billing request for CAD currency compliance
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerId, amount, currency, description, invoiceDate } = body;

    if (!customerId || !amount || !currency) {
      return NextResponse.json(
        { error: 'Missing required fields: customerId, amount, currency' },
        { status: 400 }
      );
    }

    // Enforce CAD currency
    const validation = await currencyEnforcementService.validateBillingRequest({
      customerId,
      amount,
      currency,
      description: description || '',
      invoiceDate: invoiceDate ? new Date(invoiceDate) : new Date(),
    });

    if (!validation.valid) {
      return NextResponse.json(
        {
          valid: false,
          error: validation.error,
          requiredCurrency: 'CAD',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      valid: true,
      currency: 'CAD',
      amount,
      message: 'Billing request approved',
    });
  } catch (error) {
    console.error('Currency validation error:', error);
    return NextResponse.json(
      { error: 'Currency validation failed' },
      { status: 500 }
    );
  }
}
