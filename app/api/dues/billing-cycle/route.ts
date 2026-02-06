import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { DuesCalculationEngine } from '@/lib/dues-calculation-engine';

/**
 * Generate dues transactions for a billing cycle
 * Admin only endpoint
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: Check if user is admin
    
    const body = await req.json();
    const { periodStart, periodEnd } = body;

    if (!periodStart || !periodEnd) {
      return NextResponse.json(
        { error: 'Missing required fields: periodStart, periodEnd' },
        { status: 400 }
      );
    }

    // TODO: Get tenantId from user session
    const tenantId = 'default-tenant';

    const result = await DuesCalculationEngine.generateBillingCycle(
      tenantId,
      new Date(periodStart),
      new Date(periodEnd)
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error generating billing cycle:', error);
    return NextResponse.json(
      { error: 'Failed to generate billing cycle' },
      { status: 500 }
    );
  }
}
