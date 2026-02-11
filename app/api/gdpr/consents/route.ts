import { NextRequest, NextResponse } from "next/server";
import { withApiAuth, getCurrentUser } from "@/lib/api-auth-guard";
import { db } from "@/db";
import { userConsents } from "@/db/schema";
import { consentPurposes, consentTypeValues, type ConsentType } from "@/lib/gdpr/consent-purposes";
import { ConsentManager } from "@/lib/gdpr/consent-manager";
import { and, eq, desc } from "drizzle-orm";

export const GET = withApiAuth(async (request: NextRequest) => {
  try {
    const user = await getCurrentUser();
    if (!user || !user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const organizationIdFromQuery =
      searchParams.get("organizationId") ?? searchParams.get("tenantId");

    if (!organizationIdFromQuery) {
      return NextResponse.json(
        { error: "Organization ID required" },
        { status: 400 }
      );
    }

    const consents = await db
      .select()
      .from(userConsents)
      .where(
        and(
          eq(userConsents.userId, user.id),
          eq(userConsents.tenantId, organizationIdFromQuery)
        )
      )
      .orderBy(desc(userConsents.grantedAt));

    return NextResponse.json({
      purposes: consentPurposes,
      consents,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to load consents" },
      { status: 500 }
    );
  }
});

function isConsentType(value: string | undefined): value is ConsentType {
  return value ? (consentTypeValues as readonly string[]).includes(value) : false;
}

export const POST = withApiAuth(async (request: NextRequest) => {
  try {
    const user = await getCurrentUser();
    if (!user || !user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { tenantId, organizationId, granted } = body || {};
    const consentTypeRaw = body?.consentType as string | undefined;
    const resolvedTenantId = organizationId ?? tenantId;

    if (!resolvedTenantId || !isConsentType(consentTypeRaw)) {
      return NextResponse.json(
        { error: "tenantId and consentType are required" },
        { status: 400 }
      );
    }

    const consentType = consentTypeRaw;

    const purpose = consentPurposes.find((p) => p.id === consentType);
    if (!purpose) {
      return NextResponse.json(
        { error: "Unknown consent type" },
        { status: 400 }
      );
    }

    const ipAddress =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = request.headers.get("user-agent") || undefined;

    if (granted) {
      const consent = await ConsentManager.recordConsent({
        userId: user.id,
        tenantId: resolvedTenantId,
        consentType: purpose.id,
        legalBasis: purpose.legalBasis,
        processingPurpose: purpose.processingPurpose,
        consentVersion: purpose.consentVersion,
        consentText: purpose.consentText,
        ipAddress,
        userAgent,
        metadata: {
          source: "web",
          dataCategories: purpose.dataUse,
        },
      });

      return NextResponse.json({ consent });
    }

    const existing = await db
      .select({ id: userConsents.id })
      .from(userConsents)
      .where(
        and(
          eq(userConsents.userId, user.id),
          eq(userConsents.tenantId, resolvedTenantId),
          eq(userConsents.consentType, consentType)
        )
      )
      .orderBy(desc(userConsents.grantedAt))
      .limit(1);

    if (!existing[0]?.id) {
      return NextResponse.json({
        success: true,
        message: "No consent record to withdraw",
      });
    }

    await ConsentManager.withdrawConsent(user.id, existing[0].id);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to update consent" },
      { status: 500 }
    );
  }
});
