/**
 * Founder Conflict Validator
 * 
 * Validates conflict-of-interest safeguards for union founders:
 * - Blind trust for union assets
 * - Resignation from union office
 * - Arms-length transactions
 */

import { BlindSpotValidator, ValidationResult, ValidationFinding } from './framework';
import { glob } from 'glob';
import fs from 'fs/promises';

export class FounderConflictValidator extends BlindSpotValidator {
  name = '11. Founder Conflict';
  description = 'Validates blind trust and conflict-of-interest safeguards';
  category = 'governance';

  async validate(): Promise<ValidationResult> {
    const findings: ValidationFinding[] = [];

    const hasBlindTrust = await this.checkBlindTrust();
    const hasConflictPolicy = await this.checkConflictPolicy();
    const hasResignation = await this.checkResignationRequirement();

    if (!hasBlindTrust) {
      findings.push({
        file: 'docs/governance',
        issue: 'No blind trust documentation for founder assets',
        severity: 'high',
      });
    }

    if (!hasConflictPolicy) {
      findings.push({
        file: 'docs/governance',
        issue: 'No conflict-of-interest policy found',
        severity: 'high',
      });
    }

    if (!hasResignation) {
      findings.push({
        file: 'docs/governance',
        issue: 'No resignation requirement from union office',
        severity: 'high',
      });
    }

    if (findings.length > 0) {
      return this.warn(
        `Founder conflict-of-interest documentation gaps`,
        findings,
        this.generateFix()
      );
    }

    return this.pass('Founder conflict safeguards documented');
  }

  private async checkBlindTrust(): Promise<boolean> {
    try {
      const files = await glob('docs/**/*{blind-trust,trust,conflict}*.{md,pdf}', {
        cwd: process.cwd(),
        nocase: true,
      });

      for (const file of files) {
        const content = await fs.readFile(file, 'utf-8');
        if (content.match(/blind.trust|independent.trustee/i)) {
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  private async checkConflictPolicy(): Promise<boolean> {
    try {
      const files = await glob('docs/**/*{conflict,governance,ethics}*.{md,pdf}', {
        cwd: process.cwd(),
        nocase: true,
      });
      return files.length > 0;
    } catch {
      return false;
    }
  }

  private async checkResignationRequirement(): Promise<boolean> {
    try {
      const files = await glob('docs/**/*.{md,pdf}', {
        cwd: process.cwd(),
      });

      for (const file of files) {
        const content = await fs.readFile(file, 'utf-8');
        if (content.match(/resign.*union.*office|step.*down.*union|leave.*union.*position/i)) {
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  private generateFix(): string {
    return `
// docs/governance/founder-conflict-policy.md
# Founder Conflict-of-Interest Policy

## Purpose
To prevent conflicts of interest between Union Eyes founders and the union locals they serve.

## Blind Trust Requirement

### For Founders Who Hold Union Office
If a Union Eyes founder currently holds or previously held union office (elected or appointed), they MUST:

1. **Establish Blind Trust**
   - All Union Eyes shares placed in independent trust
   - Trustee has sole discretion over voting rights
   - Founder receives only financial distributions (no control)
   - Trust term: Minimum 5 years from union office resignation

2. **Independent Trustee**
   - Must be arms-length (no family, business, or union ties)
   - Licensed professional (lawyer, accountant, or trust company)
   - Bonded and insured
   - Reports annually to Union Eyes Board

### Current Status (2026)
- **Founder A**: Former shop steward, Local 123
  - Status: ✅ Blind trust established (Trustee: [Name])
  - Resignation Date: [Date]
  - Trust Expires: [Date]

- **Founder B**: Never held union office
  - Status: ✅ No conflict, direct ownership permitted

## Resignation Requirement

### Mandatory Resignation
Founders MUST resign from ALL union positions before:
- Taking operational role at Union Eyes
- Joining Union Eyes Board of Directors
- Receiving any compensation from Union Eyes

### Cooling-Off Period
- 12 months between union office resignation and Union Eyes role
- Exception: Advisory roles (uncompensated only)

## Arms-Length Transactions

### Prohibited
- Union Eyes contracts with founder's current/former union local
- Preferential pricing for founder's union local
- Founder influence over union local's purchase decisions

### Required
- All transactions at fair market value
- Independent Board approval for any founder-related transactions
- Public disclosure of any potential conflicts

## Ongoing Compliance

### Annual Declarations
All founders must annually certify:
- Current union memberships/offices (if any)
- Family members in union leadership
- Business relationships with unions
- Any potential conflicts of interest

### Monitoring
- Ethics officer reviews all founder transactions
- Board audit committee reviews annually
- External audit every 3 years

## Penalties for Violation

### Minor Violations
- Written warning
- Mandatory ethics training
- Increased monitoring

### Major Violations
- Removal from operational role
- Forced sale of shares
- Legal action for breach of fiduciary duty

## Member Protection

### Whistleblower Protection
Union members can report conflicts anonymously:
- Email: ethics@unioneyes.ca
- Hotline: 1-800-XXX-XXXX
- Protection from retaliation guaranteed

### Transparency
- All conflict declarations published on website
- Annual governance report to all union members
- Board meeting minutes (redacted for privacy)

## Legal Framework
This policy complies with:
- Canada Corporations Act fiduciary duty requirements
- Provincial union financial oversight regulations
- CRA non-profit governance guidelines

---

// lib/services/governance-service.ts
export class GovernanceService {
  async checkFounderConflict(
    founderId: string,
    transactionType: string
  ): Promise<{ hasConflict: boolean; reason: string }> {
    const founder = await db.query.founders.findFirst({
      where: eq(founders.id, founderId),
      with: { blindTrust: true, unionAffiliations: true }
    });

    // Check if founder has active union office
    const activeUnionRoles = founder.unionAffiliations.filter(
      a => a.status === 'active'
    );

    if (activeUnionRoles.length > 0) {
      return {
        hasConflict: true,
        reason: \`Founder holds active union office: \${activeUnionRoles.map(r => r.position).join(', ')}\`
      };
    }

    // Check if blind trust is properly established
    if (founder.requiresBlindTrust && !founder.blindTrust) {
      return {
        hasConflict: true,
        reason: 'Founder required to have blind trust but none established'
      };
    }

    // Check cooling-off period
    const lastUnionRole = founder.unionAffiliations
      .filter(a => a.status === 'resigned')
      .sort((a, b) => b.resignationDate.getTime() - a.resignationDate.getTime())[0];

    if (lastUnionRole) {
      const monthsSinceResignation = 
        (Date.now() - lastUnionRole.resignationDate.getTime()) / (30 * 24 * 60 * 60 * 1000);
      
      if (monthsSinceResignation < 12) {
        return {
          hasConflict: true,
          reason: \`Cooling-off period not met (\${Math.floor(monthsSinceResignation)} months of 12)\`
        };
      }
    }

    return { hasConflict: false, reason: 'No conflicts detected' };
  }

  async enforceBlindTrust(founderId: string): Promise<void> {
    const founder = await db.query.founders.findFirst({
      where: eq(founders.id, founderId)
    });

    if (!founder.requiresBlindTrust) {
      throw new Error('Founder does not require blind trust');
    }

    // Verify blind trust is established
    const trust = await db.query.blindTrusts.findFirst({
      where: eq(blindTrusts.founderId, founderId)
    });

    if (!trust || trust.status !== 'active') {
      throw new Error('CRITICAL: Blind trust required but not active');
    }

    // Verify trustee independence
    if (trust.trusteeType === 'family' || trust.trusteeType === 'related') {
      throw new Error('Trustee must be independent (arms-length)');
    }

    return;
  }
}

// db/schema/governance-schema.ts
export const founders = pgTable('founders', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  requiresBlindTrust: boolean('requires_blind_trust').default(false),
  lastConflictCheck: timestamp('last_conflict_check'),
  annualDeclarationDate: timestamp('annual_declaration_date'),
});

export const blindTrusts = pgTable('blind_trusts', {
  id: uuid('id').defaultRandom().primaryKey(),
  founderId: uuid('founder_id').references(() => founders.id).notNull(),
  trusteeName: text('trustee_name').notNull(),
  trusteeType: text('trustee_type').notNull(), // independent, licensed, bonded
  establishedDate: timestamp('established_date').notNull(),
  expiryDate: timestamp('expiry_date').notNull(),
  status: text('status').notNull(), // active, expired, terminated
  annualReportUrl: text('annual_report_url'),
});

export const founderUnionAffiliations = pgTable('founder_union_affiliations', {
  id: uuid('id').defaultRandom().primaryKey(),
  founderId: uuid('founder_id').references(() => founders.id).notNull(),
  unionName: text('union_name').notNull(),
  position: text('position').notNull(),
  startDate: timestamp('start_date').notNull(),
  resignationDate: timestamp('resignation_date'),
  status: text('status').notNull(), // active, resigned
});
`;
  }
}
