import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * API Route: Equity Self-Identification
 * Member-facing demographic data collection with OCAP compliance
 * Phase 3: Equity & Demographics - SECURED with PIPEDA/OCAP compliance
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { memberDemographics, members } from '@/db/migrations/schema';
import { eq, and } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { z } from "zod";
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';

export const dynamic = 'force-dynamic';

export const POST = async (request: NextRequest) => {
  return withRoleAuth('steward', async (request, context) => {
    const { userId, organizationId: contextOrganizationId } = context;

  try {
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
  if (organizationId && organizationId !== contextOrganizationId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }


      // Validate required fields
      if (!memberId || !organizationId) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: '/api/equity/self-identify',
          method: 'POST',
          eventType: 'validation_failed',
          severity: 'low',
          details: {
            dataType: 'EQUITY_DATA',
            reason: 'Missing required fields',
          },
        });
        return NextResponse.json(
          { error: 'Bad Request - memberId and organizationId are required' },
          { status: 400 }
        );
      }

      // CRITICAL: Consent validation (PIPEDA requirement)
      if (!dataCollectionConsent) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: '/api/equity/self-identify',
          method: 'POST',
          eventType: 'validation_failed',
          severity: 'high',
          details: {
            dataType: 'EQUITY_DATA',
            reason: 'Data collection consent required - PIPEDA compliance',
          },
        });
        return NextResponse.json(
          { error: 'Bad Request - Data collection consent is required' },
          { status: 400 }
        );
      }

      if (!consentPurpose) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: '/api/equity/self-identify',
          method: 'POST',
          eventType: 'validation_failed',
          severity: 'high',
          details: {
            dataType: 'EQUITY_DATA',
            reason: 'Consent purpose required - PIPEDA compliance',
          },
        });
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
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: '/api/equity/self-identify',
          method: 'POST',
          eventType: 'validation_failed',
          severity: 'medium',
          details: {
            dataType: 'EQUITY_DATA',
            reason: 'Member not found',
            memberId,
          },
        });
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

      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: '/api/equity/self-identify',
        method: 'POST',
        eventType: 'success',
        severity: 'high',
        details: {
          dataType: 'EQUITY_DATA',
          memberId,
          organizationId,
          consentGiven: dataCollectionConsent,
          indigenousDataGovernanceConsent,
          isUpdate: existing && existing.length > 0,
          privacyCompliant: true,
        },
      });

      return NextResponse.json({
        success: true,
        data: result[0],
        message: 'Demographic data saved successfully',
      });

    } catch (error) {
      logger.error('Failed to save demographic data', error as Error, {
        userId,
        correlationId: request.headers.get('x-correlation-id'),
  });
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: '/api/equity/self-identify',
        method: 'POST',
        eventType: 'server_error',
        severity: 'high',
        details: {
          dataType: 'EQUITY_DATA',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
  })(request);
};

export const GET = async (request: NextRequest) => {
  return withRoleAuth('steward', async (request, context) => {
    const { userId, organizationId } = context;

  try {
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
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: '/api/equity/self-identify',
          method: 'GET',
          eventType: 'success',
          severity: 'low',
          details: {
            dataType: 'EQUITY_DATA',
            memberId,
            dataFound: false,
          },
        });
        return NextResponse.json({
          success: true,
          data: null,
          message: 'No demographic data found',
        });
      }

      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: '/api/equity/self-identify',
        method: 'GET',
        eventType: 'success',
        severity: 'high',
        details: {
          dataType: 'EQUITY_DATA',
          memberId,
          dataFound: true,
        },
      });

      return NextResponse.json({
        success: true,
        data: data[0],
      });

    } catch (error) {
      logger.error('Failed to fetch demographic data', error as Error, {
        userId,
        memberId: request.nextUrl.searchParams.get('memberId'),
        correlationId: request.headers.get('x-correlation-id'),
  });
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: '/api/equity/self-identify',
        method: 'GET',
        eventType: 'server_error',
        severity: 'high',
        details: {
          dataType: 'EQUITY_DATA',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
  })(request);
};

export const DELETE = async (request: NextRequest) => {
  return withRoleAuth('steward', async (request, context) => {
    const { userId, organizationId } = context;

  try {
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
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: '/api/equity/self-identify',
          method: 'DELETE',
          eventType: 'validation_failed',
          severity: 'low',
          details: {
            dataType: 'EQUITY_DATA',
            reason: 'No demographic data found',
            memberId,
          },
        });
        return NextResponse.json(
          { error: 'Not Found - No demographic data found' },
          { status: 404 }
        );
      }

      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: '/api/equity/self-identify',
        method: 'DELETE',
        eventType: 'success',
        severity: 'critical',
        details: {
          dataType: 'EQUITY_DATA',
          memberId,
          action: 'consent_withdrawn',
          privacyCompliant: true,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Consent withdrawn successfully. Data will be deleted per retention policy.',
      });

    } catch (error) {
      logger.error('Failed to withdraw demographic consent', error as Error, {
        userId,
        memberId: request.nextUrl.searchParams.get('memberId'),
        correlationId: request.headers.get('x-correlation-id'),
  });
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: '/api/equity/self-identify',
        method: 'DELETE',
        eventType: 'server_error',
        severity: 'high',
        details: {
          dataType: 'EQUITY_DATA',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
  })(request);
};
