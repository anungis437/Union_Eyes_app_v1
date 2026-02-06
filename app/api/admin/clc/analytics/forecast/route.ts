/**
 * CLC Analytics - Forecasting API
 * 
 * GET /api/admin/clc/analytics/forecast
 * 
 * Returns forecasted remittance data with confidence intervals
 */

import { NextRequest, NextResponse } from 'next/server';
import { forecastRemittances } from '@/services/clc/compliance-reports';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const monthsAhead = parseInt(searchParams.get('months') || '12');

    if (monthsAhead < 1 || monthsAhead > 24) {
      return NextResponse.json(
        { error: 'Invalid months parameter. Must be between 1 and 24' },
        { status: 400 }
      );
    }

    const forecast = await forecastRemittances(monthsAhead);

    return NextResponse.json(forecast, {
      headers: {
        'Cache-Control': 'public, max-age=7200' // Cache for 2 hours
      }
    });

  } catch (error) {
    console.error('Analytics forecast error:', error);
    return NextResponse.json(
      { error: 'Failed to generate forecast' },
      { status: 500 }
    );
  }
}
