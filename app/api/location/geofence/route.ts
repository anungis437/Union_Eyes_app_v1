import { NextRequest, NextResponse } from "next/server";
import { GeofencePrivacyService } from "@/services/geofence-privacy-service";

/**
 * Geofence Management API
 * POST: Create geofence
 * GET: Check if location is within geofence
 */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description, geofenceType, centerLatitude, centerLongitude, radiusMeters, strikeId, unionLocalId } = body;

    if (!name || !geofenceType || centerLatitude === undefined || centerLongitude === undefined || !radiusMeters) {
      return NextResponse.json(
        { error: "Missing required fields: name, geofenceType, centerLatitude, centerLongitude, radiusMeters" },
        { status: 400 }
      );
    }

    // Validate coordinates
    if (centerLatitude < -90 || centerLatitude > 90) {
      return NextResponse.json({ error: "Invalid centerLatitude (must be -90 to 90)" }, { status: 400 });
    }

    if (centerLongitude < -180 || centerLongitude > 180) {
      return NextResponse.json({ error: "Invalid centerLongitude (must be -180 to 180)" }, { status: 400 });
    }

    if (radiusMeters <= 0) {
      return NextResponse.json({ error: "Invalid radiusMeters (must be > 0)" }, { status: 400 });
    }

    const geofence = await GeofencePrivacyService.createGeofence({
      name,
      description,
      geofenceType,
      centerLatitude,
      centerLongitude,
      radiusMeters,
      strikeId,
      unionLocalId,
    });

    return NextResponse.json(
      {
        success: true,
        geofence,
        message: "Geofence created successfully",
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create geofence" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const geofenceId = searchParams.get("geofenceId");
    const latitude = searchParams.get("latitude");
    const longitude = searchParams.get("longitude");

    if (!userId || !geofenceId || !latitude || !longitude) {
      return NextResponse.json(
        { error: "Missing required parameters: userId, geofenceId, latitude, longitude" },
        { status: 400 }
      );
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lon)) {
      return NextResponse.json({ error: "Invalid latitude or longitude" }, { status: 400 });
    }

    const result = await GeofencePrivacyService.checkGeofenceEntry(userId, lat, lon, geofenceId);

    return NextResponse.json({
      userId,
      geofenceId,
      inside: result.inside,
      distance: result.distance,
      message: result.inside ? "User is inside geofence" : "User is outside geofence",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to check geofence" },
      { status: 500 }
    );
  }
}
