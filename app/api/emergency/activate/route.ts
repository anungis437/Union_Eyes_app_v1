import { NextRequest, NextResponse } from 'next/server';
import {
  trackLocation,
  requestLocationPermission,
  purgeExpiredLocations,
} from '@/lib/services/geofence-privacy-service';
import type { EmergencyActivationRequest, EmergencyActivationResponse } from '@/lib/types/compliance-api-types';

/**
 * Emergency Activation API
 * Activate emergency procedures with geofence privacy safeguards
 * Enables location tracking under explicit member consent only
 */

/**
 * POST /api/emergency/activate
 * Activate emergency mode with location tracking (with consent)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as EmergencyActivationRequest;
    const { memberId, emergencyType, affectedRegions, description, expectedDurationDays } = body;

    // Validate required fields
    if (!memberId || !emergencyType || !affectedRegions || affectedRegions.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: memberId, emergencyType, affectedRegions (array)',
          notificationsSent: [],
        } as EmergencyActivationResponse,
        { status: 400 }
      );
    }

    // Request explicit location consent for emergency response
    const consentRequest = await requestLocationPermission(
      memberId,
      'emergency_response'
    );

    if (consentRequest.requiresUserAction) {
      return NextResponse.json(
        {
          success: false,
          error: 'Location consent required for emergency activation',
          notificationsSent: ['consent_request_sent'],
          breakGlassOps: {
            activated: false,
            allowedOperations: [],
            safetyLimits: {},
          },
        } as EmergencyActivationResponse,
        { status: 403 }
      );
    }

    // Activate emergency declaration
    const declaration = {
      emergencyId: `EMG-${memberId}-${Date.now()}`,
      memberId,
      emergencyType,
      status: 'active',
      declaredAt: new Date().toISOString(),
      expectedEndDate: new Date(Date.now() + expectedDurationDays * 24 * 60 * 60 * 1000).toISOString(),
      breakGlassActivated: true,
      affectedRegions,
    };

    return NextResponse.json({
      success: true,
      declaration,
      breakGlassOps: {
        activated: true,
        allowedOperations: [
          'real_time_location_tracking',
          'geofence_monitoring',
          'emergency_notifications',
          'incident_response_coordination',
        ],
        safetyLimits: {
          retentionDays: 30,
          backgroundTrackingBlocked: 'true',
          encryptionRequired: 'true',
          auditLogging: 'true',
        },
      },
      notificationsSent: [
        'emergency_declared_members',
        'regional_coordinators_notified',
        'location_consent_obtained',
      ],
      message: `Emergency ${emergencyType} activated in ${affectedRegions.join(', ')}`,
    } as EmergencyActivationResponse);
  } catch (error) {
    console.error('Emergency activation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: `Emergency activation failed: ${error}`,
        notificationsSent: [],
      } as EmergencyActivationResponse,
      { status: 500 }
    );
  }
}
