import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * API Route: Equity Self-Identification
 * Member-facing demographic data collection with OCAP compliance
 * Phase 3: Equity & Demographics - SECURED with PIPEDA/OCAP compliance
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { memberDemographics, members } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { z } from "zod";
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
export const dynamic = 'force-dynamic';


const equitySelfIdentifySchema = z.object({
  memberId: z.string().uuid('Invalid memberId'),
  organizationId: z.string().uuid('Invalid organizationId'),
  // Consent (REQUIRED)
        dataCollectionConsent: z.unknown().optional(),
  consentType: z.unknown().optional().default('explicit'),
  consentPurpose: z.string().min(1, 'consentPurpose is required'),
  dataRetentionYears: z.unknown().optional().default(7),
  // Equity groups
        equityGroups: z.unknown().optional().default([]),
  // Gender identity
        genderIdentity: z.string().uuid('Invalid genderIdentity'),
  genderIdentityOther: z.string().uuid('Invalid genderIdentityOther'),
  // Indigenous identity (OCAP)
        isIndigenous: z.string().uuid('Invalid isIndigenous'),
  indigenousIdentity: z.string().uuid('Invalid indigenousIdentity'),
  indigenousNation: z.unknown().optional(),
  indigenousTreatyNumber: z.unknown().optional(),
  indigenousDataGovernanceConsent: z.unknown().optional().default(false),
  // Visible minority
        isVisibleMinority: z.boolean().optional(),
  visibleMinorityGroups: z.boolean().optional(),
  // Disability
        hasDisability: z.boolean().optional(),
  disabilityTypes: z.boolean().optional(),
  requiresAccommodation: z.unknown().optional(),
  accommodationDetailsEncrypted: z.unknown().optional(),
  // LGBTQ2+
        isLgbtq2Plus: z.boolean().optional(),
  lgbtq2PlusIdentity: z.string().uuid('Invalid lgbtq2PlusIdentity'),
  // Demographics
        dateOfBirth: z.string().datetime().optional(),
  ageRange: z.unknown().optional(),
  isNewcomer: z.boolean().optional(),
  immigrationYear: z.unknown().optional(),
  countryOfOrigin: z.number().int().positive(),
  primaryLanguage: z.unknown().optional(),
  speaksFrench: z.unknown().optional(),
  speaksIndigenousLanguage: z.unknown().optional(),
  indigenousLanguageName: z.string().min(1, 'indigenousLanguageName is required'),
  // Accessibility
        needsInterpretation: z.unknown().optional(),
  interpretationLanguage: z.unknown().optional(),
  needsTranslation: z.unknown().optional(),
  translationLanguage: z.unknown().optional(),
  needsMobilityAccommodation: z.unknown().optional(),
  // Privacy controls
        allowAggregateReporting: z.unknown().optional().default(true),
  allowResearchParticipation: z.unknown().optional().default(false),
  allowExternalReporting: z.unknown().optional().default(false),
});

export const POST = async (request: NextRequest) => {
  return withRoleAuth('steward', async (request, context) => {
    const { userId, organizationId: contextOrganizationId } = context;

  try {
      const body = await request.json();
    // Validate request body
    const validation = equitySelf-identifySchema.safeParse(body);
    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request data',
        validation.error.errors
      );
    }
    
      // DUPLICATE REMOVED:     const { memberId, organizationId, // Consent (REQUIRED)
      // DUPLICATE REMOVED:         dataCollectionConsent, consentType = 'explicit', consentPurpose, dataRetentionYears = 7, // Equity groups
      // DUPLICATE REMOVED:         equityGroups = [], // Gender identity
      // DUPLICATE REMOVED:         genderIdentity, genderIdentityOther, // Indigenous identity (OCAP)
      // DUPLICATE REMOVED:         isIndigenous, indigenousIdentity, indigenousNation, indigenousTreatyNumber, indigenousDataGovernanceConsent = false, // Visible minority
      // DUPLICATE REMOVED:         isVisibleMinority, visibleMinorityGroups, // Disability
      // DUPLICATE REMOVED:         hasDisability, disabilityTypes, requiresAccommodation, accommodationDetailsEncrypted, // LGBTQ2+
      // DUPLICATE REMOVED:         isLgbtq2Plus, lgbtq2PlusIdentity, // Demographics
      // DUPLICATE REMOVED:         dateOfBirth, ageRange, isNewcomer, immigrationYear, countryOfOrigin, primaryLanguage, speaksFrench, speaksIndigenousLanguage, indigenousLanguageName, // Accessibility
      // DUPLICATE REMOVED:         needsInterpretation, interpretationLanguage, needsTranslation, translationLanguage, needsMobilityAccommodation, // Privacy controls
      // DUPLICATE REMOVED:         allowAggregateReporting = true, allowResearchParticipation = false, allowExternalReporting = false } = validation.data;
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
    return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Forbidden'
    );
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
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Bad Request - memberId and organizationId are required'
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
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Bad Request - Data collection consent is required'
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
        return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Not Found - Member not found'
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
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Internal Server Error',
      error
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
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Bad Request - memberId is required'
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
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Internal Server Error',
      error
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
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Bad Request - memberId is required'
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
        return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Not Found - No demographic data found'
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
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Internal Server Error',
      error
    );
  }
  })(request);
};

