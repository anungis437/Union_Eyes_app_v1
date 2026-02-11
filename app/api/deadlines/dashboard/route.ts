/**
 * GET /api/deadlines/dashboard
 * Dashboard summary with counts and metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDashboardSummary } from '@/lib/deadline-service';
import { withApiAuth } from '@/lib/api-auth-guard';

export const GET = withApiAuth(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const organizationId = (searchParams.get('organizationId') ?? searchParams.get('tenantId'));
  const tenantId = organizationId;
  
  if (!tenantId) {
    return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
  }
  
  try {
    const summary = await getDashboardSummary(tenantId);
    return NextResponse.json(summary);
  } catch (error) {
return NextResponse.json(
      { error: 'Failed to fetch summary' },
      { status: 500 }
    );
  }
});

