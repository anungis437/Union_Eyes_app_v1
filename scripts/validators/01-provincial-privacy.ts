/**
 * Provincial Privacy Mismatch Validator
 * 
 * Validates that provincial privacy laws are correctly applied:
 * - AB PIPA (Alberta Personal Information Protection Act)
 * - BC PIPA (British Columbia)
 * - QC Law 25 (Quebec modernization of privacy law)
 * - ON PHIPA (Personal Health Information Protection Act)
 */

import { BlindSpotValidator, ValidationResult, ValidationFinding } from './framework';
import { glob } from 'glob';
import fs from 'fs/promises';
import path from 'path';

export class ProvincialPrivacyValidator extends BlindSpotValidator {
  name = '1. Provincial Privacy Mismatch';
  description = 'Validates province-specific privacy compliance routing';
  category = 'privacy';

  async validate(): Promise<ValidationResult> {
    const findings: ValidationFinding[] = [];

    // Check for provincial privacy handlers
    const privacyHandlers = await this.findPrivacyHandlers();
    
    // Check database schema for province field
    const hasProvinceField = await this.checkDatabaseSchema();
    
    // Check for breach notification handlers (72h requirement)
    const hasBreachNotification = await this.checkBreachNotification();
    
    // Check for consent management per province
    const hasConsentManagement = await this.checkConsentManagement();

    if (!hasProvinceField) {
      findings.push({
        file: 'db/schema',
        issue: 'No province/territory field found in user/member tables',
        severity: 'critical',
      });
    }

    if (privacyHandlers.length === 0) {
      findings.push({
        file: 'lib/services',
        issue: 'No provincial privacy handlers found',
        severity: 'critical',
      });
    }

    if (!hasBreachNotification) {
      findings.push({
        file: 'lib/services/security',
        issue: '72-hour breach notification handler missing',
        severity: 'high',
      });
    }

    if (!hasConsentManagement) {
      findings.push({
        file: 'lib/services/consent',
        issue: 'Province-specific consent management missing',
        severity: 'high',
      });
    }

    if (findings.length > 0) {
      return this.fail(
        `Found ${findings.length} provincial privacy compliance gaps`,
        findings,
        this.generateFix()
      );
    }

    return this.pass(
      'All provincial privacy routing appears correctly configured'
    );
  }

  private async findPrivacyHandlers(): Promise<string[]> {
    try {
      const files = await glob('lib/services/**/*privacy*.ts', {
        cwd: process.cwd(),
      });
      return files;
    } catch {
      return [];
    }
  }

  private async checkDatabaseSchema(): Promise<boolean> {
    try {
      const schemaFiles = await glob('db/schema/**/*.ts', {
        cwd: process.cwd(),
      });

      for (const file of schemaFiles) {
        const content = await fs.readFile(file, 'utf-8');
        if (content.match(/province|territory|region/i)) {
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  private async checkBreachNotification(): Promise<boolean> {
    try {
      const files = await glob('lib/services/**/*breach*.ts', {
        cwd: process.cwd(),
      });
      return files.length > 0;
    } catch {
      return false;
    }
  }

  private async checkConsentManagement(): Promise<boolean> {
    try {
      const files = await glob('lib/services/**/*consent*.ts', {
        cwd: process.cwd(),
      });
      return files.length > 0;
    } catch {
      return false;
    }
  }

  private generateFix(): string {
    return `
// Add to db/schema/privacy-schema.ts:
export const provincialPrivacyConfig = pgTable('provincial_privacy_config', {
  province: text('province').notNull(), // AB, BC, ON, QC, etc.
  breachNotificationHours: integer('breach_notification_hours').default(72),
  consentRequired: boolean('consent_required').default(true),
  dataRetentionDays: integer('data_retention_days'),
  contactAuthority: text('contact_authority'), // Privacy Commissioner contact
});

// Add province field to users/members:
ALTER TABLE users ADD COLUMN province TEXT;
ALTER TABLE organization_members ADD COLUMN province TEXT;

// Create provincial privacy service:
// lib/services/provincial-privacy-service.ts
export function getPrivacyRules(province: string) {
  switch(province) {
    case 'AB': return AB_PIPA_RULES;
    case 'BC': return BC_PIPA_RULES;
    case 'QC': return QC_LAW25_RULES;
    case 'ON': return ON_PHIPA_RULES;
    default: return FEDERAL_PIPEDA_RULES;
  }
}
`;
  }
}
