import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { provincialPrivacyConfig, provincialDataHandling } from '@/db/schema/provincial-privacy-schema';
import { eq } from 'drizzle-orm';

/**
 * Provincial Privacy API
 * Handles province-specific privacy rules (AB PIPA, BC PIPA, QC Law 25, ON PHIPA)
 */

// GET /api/privacy/provincial?province=QC
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const province = searchParams.get('province');

    if (!province) {
      return NextResponse.json(
        { error: 'Province parameter required' },
        { status: 400 }
      );
    }

    // Get provincial privacy rules
    const config = await db
      .select()
      .from(provincialPrivacyConfig)
      .where(eq(provincialPrivacyConfig.province, province))
      .limit(1);

    if (config.length === 0) {
      return NextResponse.json(
        { error: `No privacy configuration found for province: ${province}` },
        { status: 404 }
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
    console.error('Provincial privacy API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/privacy/provincial
// Create or update provincial privacy configuration
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { province, lawName, breachNotificationHours, consentRequired, dataRetentionDays, explicitOptIn, rightToErasure, rightToPortability, dpoRequired, piaRequired, customRules } = body;

    if (!province || typeof province !== 'string') {
      return NextResponse.json(
        { error: 'Province is required' },
        { status: 400 }
      );
    }

    // Upsert provincial privacy config
    const lawNameMap: Record<string, string> = {
      'AB': 'AB PIPA',
      'BC': 'BC PIPA',
      'ON': 'ON PHIPA',
      'QC': 'Law 25',
    };
    const defaultLawName = lawNameMap[province.toUpperCase()] || 'PIPEDA';

    const config = await db
      .insert(provincialPrivacyConfig)
      .values({
        province,
        lawName: lawName || defaultLawName,
        breachNotificationHours: String(breachNotificationHours || 72),
        consentRequired: consentRequired !== false,
        dataRetentionDays: String(dataRetentionDays || 365),
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
          breachNotificationHours: String(breachNotificationHours || 72),
          consentRequired: consentRequired !== false,
          dataRetentionDays: String(dataRetentionDays || 365),
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
    console.error('Provincial privacy config error:', error);
    return NextResponse.json(
      { error: 'Failed to update configuration' },
      { status: 500 }
    );
  }
}

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
        breachNotification: '72 hours to CAI (Commission d\'accès à l\'information)',
        consentType: 'Explicit opt-in required',
        dataResidency: 'Quebec data residency preferred',
        authority: 'CAI - Commission d\'accès à l\'information du Québec',
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
