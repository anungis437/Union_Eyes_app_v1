import { NextRequest, NextResponse } from 'next/server';
import { forceMajeureIntegrationService } from '@/services/force-majeure-integration';

/**
 * Force Majeure Emergency API
 * Activate emergency procedures and break-glass access
 */

// POST /api/emergency/activate
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventType, severity, description, impactedSystems, estimatedDuration, activatedBy, requiresBreakGlass } = body;

    if (!eventType || !severity || !description || !activatedBy) {
      return NextResponse.json(
        { error: 'Missing required fields: eventType, severity, description, activatedBy' },
        { status: 400 }
      );
    }

    // Activate force majeure
    const activation = await forceMajeureIntegrationService.activateForceMajeure({
      eventType,
      severity,
      description,
      impactedSystems: impactedSystems || [],
      estimatedDuration,
      activatedBy,
      requiresBreakGlass: requiresBreakGlass || false,
    });

    return NextResponse.json({
      success: true,
      activation,
      message: 'Force majeure activated successfully',
    });
  } catch (error) {
    console.error('Force majeure activation error:', error);
    return NextResponse.json(
      { error: 'Failed to activate force majeure' },
      { status: 500 }
    );
  }
}

// GET /api/emergency/active
export async function GET() {
  try {
    const activeEvents = await forceMajeureIntegrationService.getActiveEvents();

    return NextResponse.json({
      events: activeEvents,
      count: activeEvents.length,
    });
  } catch (error) {
    console.error('Active events error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve active events' },
      { status: 500 }
    );
  }
}
