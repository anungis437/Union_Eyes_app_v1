import { NextRequest, NextResponse } from "next/server";
import { GeofencePrivacyService } from "@/services/geofence-privacy-service";
import { withApiAuth } from '@/lib/api-auth-guard';

/**
 * Location Tracking Consent API
 * POST: Request location tracking consent
 * GET: Check consent status
 * DELETE: Revoke consent
 */

export const POST = withApiAuth(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const { userId, purpose, purposeDescription, consentText, allowedDuringStrike, allowedDuringEvents } = body;

    if (!userId || !purpose || !purposeDescription || !consentText) {
      return NextResponse.json(
        { error: "Missing required fields: userId, purpose, purposeDescription, consentText" },
        { status: 400 }
      );
    }

    // Get IP and User-Agent for audit
    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    const consent = await GeofencePrivacyService.requestLocationConsent({
      userId,
      purpose,
      purposeDescription,
      consentText,
      allowedDuringStrike,
      allowedDuringEvents,
      ipAddress,
      userAgent,
    });

    return NextResponse.json(
      {
        success: true,
        consent,
        message: "Location tracking consent granted. Data will be retained for 24 hours maximum.",
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to request location consent" },
      { status: 500 }
    );
  }
});

export const GET = withApiAuth(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const context = searchParams.get("context") as "strike" | "event" | undefined;

    if (!userId) {
      return NextResponse.json({ error: "Missing userId parameter" }, { status: 400 });
    }

    const hasConsent = await GeofencePrivacyService.hasValidConsent(userId, context);

    return NextResponse.json({
      userId,
      hasConsent,
      context,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to check consent status" },
      { status: 500 }
    );
  }
});

export const DELETE = withApiAuth(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const reason = searchParams.get("reason");

    if (!userId) {
      return NextResponse.json({ error: "Missing userId parameter" }, { status: 400 });
    }

    await GeofencePrivacyService.revokeLocationConsent(userId, reason || undefined);

    return NextResponse.json({
      success: true,
      message: "Location tracking consent revoked. All location data has been deleted.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to revoke consent" },
      { status: 500 }
    );
  }
});
