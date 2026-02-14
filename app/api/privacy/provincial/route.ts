import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { provincialPrivacyConfig, provincialDataHandling } from '@/db/schema/provincial-privacy-schema';
import { eq } from 'drizzle-orm';
import { withApiAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { z } from 'zod';

import { standardSuccessResponse } from '@/lib/api/standardized-responses';
/**
 * Provincial Privacy API
 * Handles province-specific privacy rules (AB PIPA, BC PIPA, QC Law 25, ON PHIPA)
 */

const provinceSchema = z.object({
  province: z.string().length(2).regex(/^[A-Za-z]{2}$/),
});

// GET /api/privacy/provincial?province=QC
export const GET = withRoleAuth(50, async (request) => {
  try {
    const query = provinceSchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams)
    );

    if (!query.success) {
      return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid request parameters'
    );
    }

    const province = query.data.province.toUpperCase();

    const config = await db
      .select()
      .from(provincialPrivacyConfig)
      .where(eq(provincialPrivacyConfig.province, province))
      .limit(1);

    if (config.length === 0) {
      return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Privacy configuration not found'
    );
    }

    const rules = getProvincialRules(province);

    return NextResponse.json({
      province,
      config: config[0],
      rules,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Internal server error',
      error
    );
  }
});

const privacyConfigSchema = z.object({
  province: z.string().length(2).regex(/^[A-Za-z]{2}$/),
  lawName: z.string().min(1).optional(),
  breachNotificationHours: z.number().int().positive().max(720).optional(),
  consentRequired: z.boolean().optional(),
  dataRetentionDays: z.number().int().positive().max(3650).optional(),
  explicitOptIn: z.boolean().optional(),
  rightToErasure: z.boolean().optional(),
  rightToPortability: z.boolean().optional(),
  dpoRequired: z.boolean().optional(),
  piaRequired: z.boolean().optional(),
  customRules: z.record(z.unknown()).optional(),
});

// POST /api/privacy/provincial
// Create or update provincial privacy configuration
export const POST = withRoleAuth(90, async (request) => {
  try {
    const body = await request.json();
    const parsed = privacyConfigSchema.safeParse(body);

    if (!parsed.success) {
      return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid request body'
    );
    }

    const {
      province,
      lawName,
      breachNotificationHours,
      consentRequired,
      dataRetentionDays,
      explicitOptIn,
      rightToErasure,
      rightToPortability,
      dpoRequired,
      piaRequired,
      customRules,
    } = parsed.data;

    const lawNameMap: Record<string, string> = {
      AB: 'AB PIPA',
      BC: 'BC PIPA',
      ON: 'ON PHIPA',
      QC: 'Law 25',
    };
    const provinceCode = province.toUpperCase();
    const defaultLawName = lawNameMap[provinceCode] || 'PIPEDA';

    const config = await db
      .insert(provincialPrivacyConfig)
      .values({
        province: provinceCode,
        lawName: lawName || defaultLawName,
        breachNotificationHours: String(breachNotificationHours ?? 72),
        consentRequired: consentRequired !== false,
        dataRetentionDays: String(dataRetentionDays ?? 365),
        explicitOptIn: explicitOptIn || false,
        rightToErasure: rightToErasure !== false,
        rightToPortability: rightToPortability !== false,
        dpoRequired: dpoRequired || false,
        piaRequired: piaRequired || false,
        customRules,
      })
      .onConflictDoUpdate({
        target: provincialPrivacyConfig.province,
        set: {
          lawName: lawName || defaultLawName,
          breachNotificationHours: String(breachNotificationHours ?? 72),
          consentRequired: consentRequired !== false,
          dataRetentionDays: String(dataRetentionDays ?? 365),
          explicitOptIn: explicitOptIn || false,
          rightToErasure: rightToErasure !== false,
          rightToPortability: rightToPortability !== false,
          dpoRequired: dpoRequired || false,
          piaRequired: piaRequired || false,
          customRules,
        },
      })
      .returning();

    return NextResponse.json({
      success: true,
      config: config[0],
    });
  } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to update configuration',
      error
    );
  }
});

/**
 * Get Provincial Privacy Rules
 * Returns specific rules for each province
 */
function getProvincialRules(province: string): {
  breachNotification: string;
  consentType: string;
  dataResidency: string;
  authority: string;
  key_requirements: string[];
} {
  switch (province.toUpperCase()) {
    case 'QC': // Quebec - Law 25 (CQLP)
      return {
        breachNotification: '72 hours to CAI (Commission d\'accÃ¨s Ã  l\'information)',
        consentType: 'Explicit opt-in required',
        dataResidency: 'Quebec data residency preferred',
        authority: 'CAI - Commission d\'accÃ¨s Ã  l\'information du QuÃ©bec',
        key_requirements: [
          'French language consent forms mandatory',
          'Privacy impact assessments for new processing',
          'Right to data portability',
          'Mandatory privacy officer designation',
        ],
      };

    case 'BC': // British Columbia - PIPA
      return {
        breachNotification: 'Mandatory notification if real risk of harm',
        consentType: 'Opt-in required for sensitive data',
        dataResidency: 'No specific residency requirements',
        authority: 'Office of the Information and Privacy Commissioner (OIPC) BC',
        key_requirements: [
          'Reasonable security safeguards mandatory',
          'Purpose specification at collection',
          'Access and correction rights',
          'Privacy breach register required',
        ],
      };

    case 'AB': // Alberta - PIPA
      return {
        breachNotification: 'Real risk of harm triggers notification',
        consentType: 'Opt-in for sensitive personal information',
        dataResidency: 'No specific residency requirements',
        authority: 'Office of the Information and Privacy Commissioner of Alberta',
        key_requirements: [
          'Reasonable security arrangements',
          'Individual access rights',
          'Purpose limitation principle',
          'Privacy breach notification to Commissioner',
        ],
      };

    case 'ON': // Ontario - PHIPA (health) + PIPEDA (general)
      return {
        breachNotification: 'PIPEDA rules apply (notify if real risk of harm)',
        consentType: 'Implied consent for non-sensitive, express for sensitive',
        dataResidency: 'Federal rules apply (no specific requirement)',
        authority: 'Office of the Privacy Commissioner of Canada (federal)',
        key_requirements: [
          'PIPEDA Fair Information Principles',
          'Accountability principle',
          'Safeguarding personal information',
          'Individual access rights',
        ],
      };

    default: // Other provinces - PIPEDA applies
      return {
        breachNotification: 'PIPEDA rules (notify if real risk of harm)',
        consentType: 'Meaningful consent required',
        dataResidency: 'No federal residency requirements',
        authority: 'Office of the Privacy Commissioner of Canada',
        key_requirements: [
          'PIPEDA applies as federal baseline',
          'Breach notification to OPC and individuals',
          'Record of breaches required',
          'Privacy policy must be available',
        ],
      };
  }
}

