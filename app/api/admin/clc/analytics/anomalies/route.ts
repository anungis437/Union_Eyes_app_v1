/**
 * CLC Analytics - Anomaly Detection API
 * 
 * GET /api/admin/clc/analytics/anomalies
 * 
 * Returns detected anomalies with severity levels and recommended actions
 */

import { NextRequest, NextResponse } from 'next/server';
import { detectAnomalies } from '@/services/clc/compliance-reports';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const minSeverity = searchParams.get('minSeverity') || 'medium';

    // TODO: Fetch remittances from perCapitaRemittances table when schema is implemented
    // For now, return empty array since perCapitaRemittances schema is not yet defined
    const remittances: any[] = [];
    const anomalies = await detectAnomalies(remittances, year);

    // Filter by minimum severity if specified
    const filteredAnomalies = minSeverity !== 'low'
      ? anomalies.filter(a => {
          const severityOrder = { low: 1, medium: 2, high: 3, critical: 4 };
          return severityOrder[a.severity] >= severityOrder[minSeverity as keyof typeof severityOrder];
        })
      : anomalies;

    return NextResponse.json(filteredAnomalies, {
      headers: {
        'Cache-Control': 'public, max-age=900' // Cache for 15 minutes (anomalies change frequently)
      }
    });

  } catch (error) {
    console.error('Analytics anomalies error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch anomaly data' },
      { status: 500 }
    );
  }
}
