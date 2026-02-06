import { NextRequest, NextResponse } from 'next/server';
import {
  convertUSDToCAD,
  checkT106Requirement,
  validateBillingRequest,
} from '@/lib/services/transfer-pricing-service';
import type { BillingValidationRequest, BillingValidationResponse } from '@/lib/types/compliance-api-types';

/**
 * Billing Validation API
 * Enforces CAD-only billing per CRA transfer pricing rules
 * Validates T1 General / T106 slip requirements
 */

/**
 * POST /api/billing/validate
 * Validate billing request for CAD currency compliance and T106 requirements
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as BillingValidationRequest;
    const { amount, currency, invoiceDate } = body;

    // Validate required fields
    if (!amount || !currency) {
      return NextResponse.json(
        {
          valid: false,
          error: 'Missing required fields: amount, currency',
          currency: 'CAD',
        },
        { status: 400 }
      );
    }

    // Validate billing request
    const validation = await validateBillingRequest({
      invoiceId: `inv-${Date.now()}`,
      amount,
      currency,
      date: invoiceDate ? new Date(invoiceDate) : new Date(),
    });

    if (!validation.valid) {
      // If not CAD, attempt conversion
      if (currency !== 'CAD') {
        try {
          const convertedAmount = await convertUSDToCAD(amount, new Date());
          return NextResponse.json({
            valid: false,
            currency: 'CAD',
            amount: convertedAmount,
            message: `Currency must be CAD. ${currency} ${amount} = CAD ${convertedAmount.toFixed(2)}`,
            error: validation.error,
          } as BillingValidationResponse);
        } catch (conversionError) {
          return NextResponse.json(
            {
              valid: false,
              currency: 'CAD',
              error: `Currency conversion failed: ${conversionError}`,
              requiredCurrency: 'CAD',
            },
            { status: 400 }
          );
        }
      }

      return NextResponse.json(
        {
          valid: false,
          currency: 'CAD',
          error: validation.error,
          requiredCurrency: 'CAD',
        },
        { status: 400 }
      );
    }

    // Check T106 requirements
    const t106Check = await checkT106Requirement(amount, true);

    return NextResponse.json({
      valid: true,
      currency: 'CAD',
      amount,
      message: 'Billing request approved',
      requiresT106: t106Check.requiresT106,
      t106Notes: t106Check.reason,
    } as BillingValidationResponse);
  } catch (error) {
    console.error('Billing validation error:', error);
    return NextResponse.json(
      {
        valid: false,
        error: `Billing validation failed: ${error}`,
        currency: 'CAD',
      },
      { status: 500 }
    );
  }
}
