import { z } from 'zod';
import { NextRequest, NextResponse } from "next/server";
import { withApiAuth, getCurrentUser } from "@/lib/api-auth-guard";
import { db } from "@/db";
import { userConsents } from "@/db/schema";
import { consentPurposes, consentTypeValues, type ConsentType } from "@/lib/gdpr/consent-purposes";
import { ConsentManager } from "@/lib/gdpr/consent-manager";
import { and, eq, desc } from "drizzle-orm";

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
export const GET = withApiAuth(async (request: NextRequest) => {
  try {
    const user = await getCurrentUser();
    if (!user || !user.id) {
      return standardErrorResponse(
      ErrorCode.AUTH_REQUIRED,
      'Unauthorized'
    );
    }

    const { searchParams } = new URL(request.url);
    const organizationIdFromQuery =
      searchParams.get("organizationId") ?? searchParams.get("orgId") ?? searchParams.get("organization_id") ?? searchParams.get("org_id");

    if (!organizationIdFromQuery) {
      return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Organization ID required'
    );
    }

    const consents = await db
      .select()
      .from(userConsents)
      .where(
        and(
          eq(userConsents.userId, user.id),
          eq(userConsents.organizationId, organizationIdFromQuery)
        )
      )
      .orderBy(desc(userConsents.grantedAt));

    return NextResponse.json({
      purposes: consentPurposes,
      consents,
    });
  } catch {
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to load consents',
      error
    );
  }
});

function isConsentType(value: string | undefined): value is ConsentType {
  return value ? (consentTypeValues as readonly string[]).includes(value) : false;
}


const gdprConsentsSchema = z.object({
  organizationId: z.string().uuid('Invalid organizationId'),
  granted: z.unknown().optional(),
});

export const POST = withApiAuth(async (request: NextRequest) => {
  try {
    const user = await getCurrentUser();
    if (!user || !user.id) {
      return standardErrorResponse(
      ErrorCode.AUTH_REQUIRED,
      'Unauthorized'
    );
    }

    const body = await request.json();
    // Validate request body
    const validation = gdprConsentsSchema.safeParse(body);
    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request data',
        validation.error.errors
      );
    }
    
    const { organizationId, granted } = validation.data;
    const consentTypeRaw = body?.consentType as string | undefined;
    const resolvedOrganizationId = organizationId;

    if (!resolvedOrganizationId || !isConsentType(consentTypeRaw)) {
      return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'organizationId and consentType are required'
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
        organizationId: resolvedOrganizationId,
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
          eq(userConsents.organizationId, resolvedOrganizationId),
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
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to update consent',
      error
    );
  }
});
