/**
 * CLC Analytics - Multi-Year Trends API
 * 
 * GET /api/admin/clc/analytics/trends
 * 
 * Returns trend analysis data for specified time period
 */

import { NextRequest, NextResponse } from 'next/server';
import { analyzeMultiYearTrends } from '@/services/clc/compliance-reports';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const years = parseInt(searchParams.get('years') || '3');
    
    if (![3, 5, 10].includes(years)) {
      return NextResponse.json(
        { error: 'Invalid years parameter. Must be 3, 5, or 10' },
        { status: 400 }
      );
    }

    const trends = await analyzeMultiYearTrends({ years: years as 3 | 5 | 10 });

    return NextResponse.json(trends, {
      headers: {
        'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
      }
    });

  } catch (error) {
    console.error('Analytics trends error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trend data' },
      { status: 500 }
    );
  }
}
