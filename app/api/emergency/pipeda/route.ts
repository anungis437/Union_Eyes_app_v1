import { NextRequest, NextResponse } from 'next/server';
import { forceMajeureIntegrationService } from '@/services/force-majeure-integration';

/**
 * PIPEDA Breach Assessment API
 * Assess if force majeure event requires PIPEDA breach notification
 */

// GET /api/emergency/pipeda?eventId=xxx
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const eventId = searchParams.get('eventId');

    if (!eventId) {
      return NextResponse.json(
        { error: 'eventId parameter required' },
        { status: 400 }
      );
    }

    const assessment = await forceMajeureIntegrationService.assessPIPEDABreach(eventId);

    return NextResponse.json(assessment);
  } catch (error) {
    console.error('PIPEDA assessment error:', error);
    return NextResponse.json(
      { error: 'Failed to assess PIPEDA breach' },
      { status: 500 }
    );
  }
}
