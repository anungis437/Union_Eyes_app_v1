import { NextRequest, NextResponse } from "next/server";
import { GeofencePrivacyService } from "@/services/geofence-privacy-service";

/**
 * Location Tracking API
 * POST: Record user location (requires explicit consent)
 */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, latitude, longitude, accuracy, altitude, purpose, activityType, strikeId, eventId } = body;

    if (!userId || latitude === undefined || longitude === undefined || !purpose) {
      return NextResponse.json(
        { error: "Missing required fields: userId, latitude, longitude, purpose" },
        { status: 400 }
      );
    }

    // Validate coordinates
    if (latitude < -90 || latitude > 90) {
      return NextResponse.json({ error: "Invalid latitude (must be -90 to 90)" }, { status: 400 });
    }

    if (longitude < -180 || longitude > 180) {
      return NextResponse.json({ error: "Invalid longitude (must be -180 to 180)" }, { status: 400 });
    }

    // Track location (service will verify consent)
    const location = await GeofencePrivacyService.trackLocation({
      userId,
      latitude,
      longitude,
      accuracy,
      altitude,
      purpose,
      activityType,
      strikeId,
      eventId,
    });

    return NextResponse.json(
      {
        success: true,
        location,
        message: "Location recorded. Data will be automatically deleted after 24 hours.",
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to track location" },
      { status: 500 }
    );
  }
}
