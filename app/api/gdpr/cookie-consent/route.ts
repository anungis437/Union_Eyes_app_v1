/**
 * GDPR Cookie Consent API
 * POST /api/gdpr/cookie-consent
 */

import { NextRequest, NextResponse } from "next/server";
import { withApiAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { CookieConsentManager } from "@/lib/gdpr/consent-manager";

export const POST = withApiAuth(async (request: NextRequest) => {
  try {
    const user = await getCurrentUser();
    const body = await request.json();

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
    const ipAddress = request.headers.get("x-forwarded-for") || 
                      request.headers.get("x-real-ip") || 
                      "unknown";

    const consent = await CookieConsentManager.saveCookieConsent({
      userId: user?.id || null,
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
});

export const GET = async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
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
};

