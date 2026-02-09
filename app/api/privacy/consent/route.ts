import { NextRequest, NextResponse } from "next/server";
import { ProvincialPrivacyService, type Province } from "@/services/provincial-privacy-service";
import { requireApiAuth } from '@/lib/api-auth-guard';

/**
 * POST /api/privacy/consent
 * Record user consent for provincial privacy compliance
 * 
 * GUARDED: requireApiAuth
 */
export async function POST(request: NextRequest) {
  try {
    // Authentication guard
    const { userId } = await requireApiAuth();

    const body = await request.json();
    const { province, consentType, consentGiven, consentText, consentLanguage } = body;

    if (!province || !consentType || typeof consentGiven !== "boolean" || !consentText) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Get user IP and user agent for audit trail
    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || undefined;
    const userAgent = request.headers.get("user-agent") || undefined;

    const consent = await ProvincialPrivacyService.recordConsent({
      userId,
      province: province as Province,
      consentType,
      consentGiven,
      consentMethod: body.consentMethod || "explicit_checkbox",
      consentText,
      consentLanguage: consentLanguage || "en",
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ 
      success: true, 
      consent,
      message: "Consent recorded successfully" 
    });
  } catch (error: any) {
    console.error("Consent recording error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to record consent" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/privacy/consent?province=QC&consentType=marketing
 * Check if user has valid consent
 * 
 * GUARDED: requireApiAuth
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication guard
    const { userId } = await requireApiAuth();

    const { searchParams } = new URL(request.url);
    const province = searchParams.get("province") as Province;
    const consentType = searchParams.get("consentType");

    if (!province || !consentType) {
      return NextResponse.json({ error: "Missing province or consentType" }, { status: 400 });
    }

    const hasConsent = await ProvincialPrivacyService.hasValidConsent(
      userId,
      province,
      consentType
    );

    return NextResponse.json({ hasConsent });
  } catch (error: any) {
    console.error("Consent check error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to check consent" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/privacy/consent
 * Revoke user consent (right to withdraw consent)
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { province, consentType } = body;

    if (!province || !consentType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await ProvincialPrivacyService.revokeConsent(
      userId,
      province as Province,
      consentType
    );

    return NextResponse.json({ 
      success: true,
      message: "Consent revoked successfully" 
    });
  } catch (error: any) {
    console.error("Consent revocation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to revoke consent" },
      { status: 500 }
    );
  }
}
