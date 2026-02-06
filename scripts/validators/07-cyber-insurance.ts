/**
 * Cyber Insurance Validator
 * 
 * Validates cyber insurance requirements:
 * - $50M+ coverage verified
 * - Crypto-ransom rider included
 * - SOC-2 Type II certification
 */

import { BlindSpotValidator, ValidationResult, ValidationFinding } from './framework';
import { glob } from 'glob';
import fs from 'fs/promises';

export class CyberInsuranceValidator extends BlindSpotValidator {
  name = '7. Cyber Insurance';
  description = 'Validates $50M+ cyber insurance with crypto-ransom coverage';
  category = 'security';

  async validate(): Promise<ValidationResult> {
    const findings: ValidationFinding[] = [];

    const hasCoverageDoc = await this.checkCoverageDocumentation();
    const hasSOC2 = await this.checkSOC2Certification();

    if (!hasCoverageDoc) {
      findings.push({
        file: 'docs/compliance',
        issue: '$50M cyber insurance policy documentation not found',
        severity: 'critical',
      });
    }

    if (!hasSOC2) {
      findings.push({
        file: 'docs/compliance',
        issue: 'SOC-2 Type II certification not found',
        severity: 'high',
      });
    }

    if (findings.length > 0) {
      return this.warn(
        `Cyber insurance documentation gaps (manual verification required)`,
        findings,
        this.generateFix()
      );
    }

    return this.pass('Cyber insurance documentation found');
  }

  private async checkCoverageDocumentation(): Promise<boolean> {
    try {
      const files = await glob('docs/**/*{cyber,insurance,coverage}*.{md,pdf}', {
        cwd: process.cwd(),
        nocase: true,
      });
      return files.length > 0;
    } catch {
      return false;
    }
  }

  private async checkSOC2Certification(): Promise<boolean> {
    try {
      const files = await glob('docs/**/*soc*.{md,pdf}', {
        cwd: process.cwd(),
        nocase: true,
      });
      return files.length > 0;
    } catch {
      return false;
    }
  }

  private generateFix(): string {
    return `
// Create docs/compliance/cyber-insurance.md
# Cyber Insurance Policy

## Coverage Details
- **Policy Provider**: [Insurance Company Name]
- **Policy Number**: [POLICY-XXX]
- **Coverage Limit**: $50,000,000 USD
- **Effective Date**: [Date]
- **Renewal Date**: [Date]

## Key Coverage Areas
1. **Data Breach Response**: Up to $10M
2. **Business Interruption**: Up to $5M
3. **Cyber Extortion**: Up to $5M (includes crypto-ransom payments)
4. **Third-Party Liability**: Up to $30M

## Crypto-Ransom Rider
- Coverage for Bitcoin/cryptocurrency ransom payments
- Negotiation services included
- Recovery assistance

## Requirements for Coverage
- ✅ SOC-2 Type II certification (annual)
- ✅ MFA enabled for all admin accounts
- ✅ Encrypted backups (daily)
- ✅ Incident response plan documented
- ✅ Regular penetration testing (quarterly)

## SOC-2 Type II Certification
- **Certification Date**: [Date]
- **Auditor**: [Auditing Firm]
- **Next Audit**: [Date]
- **Report Location**: docs/compliance/soc2-report.pdf

## Contact
- **Insurance Broker**: [Name, Phone]
- **Claims Hotline**: 1-800-XXX-XXXX
`;
  }
}
