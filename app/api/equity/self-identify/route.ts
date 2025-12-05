/**
 * API Route: Equity Self-Identification
 * Member-facing demographic data collection with OCAP compliance
 * Phase 2: Equity & Demographics
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db/db';
import { memberDemographics, members } from '@/db/migrations/schema';
import { eq, and } from 'drizzle-orm';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * POST /api/equity/self-identify
 * Submit demographic self-identification data
 * CRITICAL: Requires explicit consent, PIPEDA compliant
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      memberId,
      organizationId,
      // Consent (REQUIRED)
      dataCollectionConsent,
      consentType = 'explicit',
      consentPurpose,
      dataRetentionYears = 7,
      // Equity groups
      equityGroups = [],
      // Gender identity
      genderIdentity,
      genderIdentityOther,
      // Indigenous identity (OCAP)
      isIndigenous,
      indigenousIdentity,
      indigenousNation,
      indigenousTreatyNumber,
      indigenousDataGovernanceConsent = false,
      // Visible minority
      isVisibleMinority,
      visibleMinorityGroups,
      // Disability
      hasDisability,
      disabilityTypes,
      requiresAccommodation,
      accommodationDetailsEncrypted,
      // LGBTQ2+
      isLgbtq2Plus,
      lgbtq2PlusIdentity,
      // Demographics
      dateOfBirth,
      ageRange,
      isNewcomer,
      immigrationYear,
      countryOfOrigin,
      primaryLanguage,
      speaksFrench,
      speaksIndigenousLanguage,
      indigenousLanguageName,
      // Accessibility
      needsInterpretation,
      interpretationLanguage,
      needsTranslation,
      translationLanguage,
      needsMobilityAccommodation,
      // Privacy controls
      allowAggregateReporting = true,
      allowResearchParticipation = false,
      allowExternalReporting = false,
    } = body;

    // Validate required fields
    if (!memberId || !organizationId) {
      return NextResponse.json(
        { error: 'Bad Request - memberId and organizationId are required' },
        { status: 400 }
      );
    }

    // CRITICAL: Consent validation
    if (!dataCollectionConsent) {
      return NextResponse.json(
        { error: 'Bad Request - Data collection consent is required' },
        { status: 400 }
      );
    }

    if (!consentPurpose) {
      return NextResponse.json(
        { error: 'Bad Request - Consent purpose must be specified' },
        { status: 400 }
      );
    }

    // Verify member exists and belongs to organization
    const member = await db
      .select()
      .from(members)
      .where(
        and(
          eq(members.id, memberId),
          eq(members.organizationId, organizationId)
        )
      )
      .limit(1);

    if (!member || member.length === 0) {
      return NextResponse.json(
        { error: 'Not Found - Member not found' },
        { status: 404 }
      );
    }

    // Calculate intersectionality count
    let intersectionalityCount = 0;
    if (genderIdentity && genderIdentity !== 'man') intersectionalityCount++;
    if (isIndigenous) intersectionalityCount++;
    if (isVisibleMinority) intersectionalityCount++;
    if (hasDisability) intersectionalityCount++;
    if (isLgbtq2Plus) intersectionalityCount++;
    if (isNewcomer) intersectionalityCount++;

    // Calculate data expiry date
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + dataRetentionYears);

    // Check if record exists
    const existing = await db
      .select()
      .from(memberDemographics)
      .where(eq(memberDemographics.memberId, memberId))
      .limit(1);

    let result;

    if (existing && existing.length > 0) {
      // Update existing record
      result = await db
        .update(memberDemographics)
        .set({
          dataCollectionConsent,
          consentDate: new Date().toISOString().split('T')[0],
          consentType,
          consentPurpose,
          dataRetentionYears,
          dataExpiryDate: expiryDate.toISOString().split('T')[0],
          equityGroups,
          genderIdentity,
          genderIdentityOther,
          isIndigenous,
          indigenousIdentity,
          indigenousNation,
          indigenousTreatyNumber,
          indigenousDataGovernanceConsent,
          isVisibleMinority,
          visibleMinorityGroups,
          hasDisability,
          disabilityTypes,
          requiresAccommodation,
          accommodationDetailsEncrypted,
          isLgbtq2Plus,
          lgbtq2PlusIdentity,
          dateOfBirth,
          ageRange,
          isNewcomer,
          immigrationYear,
          countryOfOrigin,
          primaryLanguage,
          speaksFrench,
          speaksIndigenousLanguage,
          indigenousLanguageName,
          intersectionalityCount,
          needsInterpretation,
          interpretationLanguage,
          needsTranslation,
          translationLanguage,
          needsMobilityAccommodation,
          allowAggregateReporting,
          allowResearchParticipation,
          allowExternalReporting,
          updatedAt: new Date().toISOString(),
          lastUpdatedBy: userId,
        })
        .where(eq(memberDemographics.memberId, memberId))
        .returning();
    } else {
      // Insert new record
      result = await db
        .insert(memberDemographics)
        .values({
          memberId,
          organizationId,
          dataCollectionConsent,
          consentDate: new Date().toISOString().split('T')[0],
          consentType,
          consentPurpose,
          dataRetentionYears,
          dataExpiryDate: expiryDate.toISOString().split('T')[0],
          equityGroups,
          genderIdentity,
          genderIdentityOther,
          isIndigenous,
          indigenousIdentity,
          indigenousNation,
          indigenousTreatyNumber,
          indigenousDataGovernanceConsent,
          isVisibleMinority,
          visibleMinorityGroups,
          hasDisability,
          disabilityTypes,
          requiresAccommodation,
          accommodationDetailsEncrypted,
          isLgbtq2Plus,
          lgbtq2PlusIdentity,
          dateOfBirth,
          ageRange,
          isNewcomer,
          immigrationYear,
          countryOfOrigin,
          primaryLanguage,
          speaksFrench,
          speaksIndigenousLanguage,
          indigenousLanguageName,
          intersectionalityCount,
          needsInterpretation,
          interpretationLanguage,
          needsTranslation,
          translationLanguage,
          needsMobilityAccommodation,
          allowAggregateReporting,
          allowResearchParticipation,
          allowExternalReporting,
          lastUpdatedBy: userId,
        })
        .returning();
    }

    return NextResponse.json({
      success: true,
      data: result[0],
      message: 'Demographic data saved successfully',
    });

  } catch (error) {
    logger.error('Failed to save demographic data', error as Error, {
      userId: (await auth()).userId,
      correlationId: request.headers.get('x-correlation-id'),
    });
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/equity/self-identify?memberId=xxx
 * Retrieve member's own demographic data
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');

    if (!memberId) {
      return NextResponse.json(
        { error: 'Bad Request - memberId is required' },
        { status: 400 }
      );
    }

    const data = await db
      .select()
      .from(memberDemographics)
      .where(eq(memberDemographics.memberId, memberId))
      .limit(1);

    if (!data || data.length === 0) {
      return NextResponse.json({
        success: true,
        data: null,
        message: 'No demographic data found',
      });
    }

    return NextResponse.json({
      success: true,
      data: data[0],
    });

  } catch (error) {
    logger.error('Failed to fetch demographic data', error as Error, {
      userId: (await auth()).userId,
      memberId: request.nextUrl.searchParams.get('memberId'),
      correlationId: request.headers.get('x-correlation-id'),
    });
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/equity/self-identify?memberId=xxx
 * Withdraw consent and delete demographic data (PIPEDA right to erasure)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');

    if (!memberId) {
      return NextResponse.json(
        { error: 'Bad Request - memberId is required' },
        { status: 400 }
      );
    }

    // Soft delete: mark consent as withdrawn
    const result = await db
      .update(memberDemographics)
      .set({
        dataCollectionConsent: false,
        consentWithdrawnDate: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString(),
      })
      .where(eq(memberDemographics.memberId, memberId))
      .returning();

    if (!result || result.length === 0) {
      return NextResponse.json(
        { error: 'Not Found - No demographic data found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Consent withdrawn successfully. Data will be deleted per retention policy.',
    });

  } catch (error) {
    logger.error('Failed to withdraw demographic consent', error as Error, {
      userId: (await auth()).userId,
      memberId: request.nextUrl.searchParams.get('memberId'),
      correlationId: request.headers.get('x-correlation-id'),
    });
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
