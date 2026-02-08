/**
 * GDPR Cookie Consent API
 * POST /api/gdpr/cookie-consent
 */

import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { CookieConsentManager } from "@/lib/gdpr/consent-manager";

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    const body = await req.json();

    const {
      consentId,
      tenantId,
      essential,
      functional,
      analytics,
      marketing,
      userAgent,
    } = body;

    if (!consentId || !tenantId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get IP address from request
    const ipAddress = req.headers.get("x-forwarded-for") || 
                      req.headers.get("x-real-ip") || 
                      "unknown";

    const consent = await CookieConsentManager.saveCookieConsent({
      userId: user?.id,
      tenantId,
      consentId,
      essential: essential ?? true,
      functional: functional ?? false,
      analytics: analytics ?? false,
      marketing: marketing ?? false,
      ipAddress,
      userAgent,
    });

    return NextResponse.json(consent);
  } catch (error) {
    console.error("Cookie consent error:", error);
    return NextResponse.json(
      { error: "Failed to save cookie consent" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const consentId = searchParams.get("consentId");

    if (!consentId) {
      return NextResponse.json(
        { error: "Consent ID required" },
        { status: 400 }
      );
    }

    const consent = await CookieConsentManager.getCookieConsent(consentId);

    if (!consent) {
      return NextResponse.json(
        { error: "Consent not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(consent);
  } catch (error) {
    console.error("Get cookie consent error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve cookie consent" },
      { status: 500 }
    );
  }
}
