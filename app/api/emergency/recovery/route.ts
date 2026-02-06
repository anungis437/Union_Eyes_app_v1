import { NextRequest, NextResponse } from 'next/server';
import { forceMajeureIntegrationService } from '@/services/force-majeure-integration';

/**
 * 48-Hour Recovery Status API
 * Monitor progress toward 48-hour recovery commitment
 */

// GET /api/emergency/recovery?eventId=xxx
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

    const status = await forceMajeureIntegrationService.check48HourRecoveryStatus(eventId);

    return NextResponse.json(status);
  } catch (error) {
    console.error('Recovery status error:', error);
    return NextResponse.json(
      { error: 'Failed to get recovery status' },
      { status: 500 }
    );
  }
}
