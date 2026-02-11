/**
 * GET /api/deadlines/upcoming
 * Get upcoming deadlines (next 7 days)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCriticalDeadlines } from '@/db/queries/deadline-queries';
import { withApiAuth } from '@/lib/api-auth-guard';

export const GET = withApiAuth(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const organizationId = (searchParams.get('organizationId') ?? searchParams.get('tenantId'));
  const tenantId = organizationId;
  
  if (!tenantId) {
    return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
  }
  
  try {
    const deadlines = await getCriticalDeadlines(tenantId);
    return NextResponse.json({ deadlines });
  } catch (error) {
return NextResponse.json(
      { error: 'Failed to fetch deadlines' },
      { status: 500 }
    );
  }
});

