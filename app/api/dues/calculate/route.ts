import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { DuesCalculationEngine } from '@/lib/dues-calculation-engine';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { memberId, periodStart, periodEnd, memberData } = body;

    if (!memberId || !periodStart || !periodEnd) {
      return NextResponse.json(
        { error: 'Missing required fields: memberId, periodStart, periodEnd' },
        { status: 400 }
      );
    }

    // TODO: Get tenantId from user session
    const tenantId = 'default-tenant';

    const calculation = await DuesCalculationEngine.calculateMemberDues({
      tenantId,
      memberId,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      memberData,
    });

    if (!calculation) {
      return NextResponse.json(
        { error: 'Unable to calculate dues for this member' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      calculation,
    });
  } catch (error) {
    console.error('Error calculating dues:', error);
    return NextResponse.json(
      { error: 'Failed to calculate dues' },
      { status: 500 }
    );
  }
}
