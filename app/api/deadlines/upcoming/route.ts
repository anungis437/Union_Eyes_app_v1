/**
 * GET /api/deadlines/upcoming
 * Get upcoming deadlines (next 7 days)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCriticalDeadlines } from '@/db/queries/deadline-queries';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenantId');
  
  if (!tenantId) {
    return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
  }
  
  try {
    const deadlines = await getCriticalDeadlines(tenantId);
    return NextResponse.json({ deadlines });
  } catch (error) {
    console.error('Failed to fetch upcoming deadlines:', error);
    return NextResponse.json(
      { error: 'Failed to fetch deadlines' },
      { status: 500 }
    );
  }
}
