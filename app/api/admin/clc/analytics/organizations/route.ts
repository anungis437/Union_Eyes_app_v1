/**
 * CLC Analytics - Organization Performance API
 * 
 * GET /api/admin/clc/analytics/organizations
 * 
 * Returns organization performance analysis and benchmarking data
 */

import { NextRequest, NextResponse } from 'next/server';
import { analyzeOrganizationPerformance } from '@/services/clc/compliance-reports';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const minOrganizations = parseInt(searchParams.get('minOrgs') || '5');

    // TODO: Fetch remittances from perCapitaRemittances table when schema is implemented
    // For now, return empty array since perCapitaRemittances schema is not yet defined
    const remittances: any[] = [];
    const performance = await analyzeOrganizationPerformance(remittances, year);

    return NextResponse.json(performance, {
      headers: {
        'Cache-Control': 'public, max-age=1800' // Cache for 30 minutes
      }
    });

  } catch (error) {
    console.error('Analytics organizations error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organization performance data' },
      { status: 500 }
    );
  }
}
