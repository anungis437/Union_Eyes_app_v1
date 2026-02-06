/**
 * GET /api/deadlines/dashboard
 * Dashboard summary with counts and metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDashboardSummary } from '@/lib/deadline-service';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenantId');
  
  if (!tenantId) {
    return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
  }
  
  try {
    const summary = await getDashboardSummary(tenantId);
    return NextResponse.json(summary);
  } catch (error) {
    console.error('Failed to fetch dashboard summary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch summary' },
      { status: 500 }
    );
  }
}
