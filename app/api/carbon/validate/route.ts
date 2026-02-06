import { NextRequest, NextResponse } from 'next/server';
import { carbonAccountingIntegration } from '@/services/carbon-accounting-integration';

/**
 * Carbon Neutral Validation API
 * Verify if Union Eyes can claim carbon neutrality
 */

// GET /api/carbon/validate
export async function GET() {
  try {
    const validation = await carbonAccountingIntegration.validateCarbonNeutralClaim();

    return NextResponse.json(validation);
  } catch (error) {
    console.error('Carbon validation error:', error);
    return NextResponse.json(
      { error: 'Failed to validate carbon neutral claim' },
      { status: 500 }
    );
  }
}
