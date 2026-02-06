import { NextRequest, NextResponse } from 'next/server';
import { forceMajeureIntegrationService } from '@/services/force-majeure-integration';

/**
 * Force Majeure Dashboard API
 * Summary of emergency preparedness and active events
 */

// GET /api/emergency/dashboard
export async function GET() {
  try {
    const dashboard = await forceMajeureIntegrationService.getForceMajeureDashboard();

    return NextResponse.json(dashboard);
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json(
      { error: 'Failed to get dashboard' },
      { status: 500 }
    );
  }
}
