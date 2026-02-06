/**
 * Golden Share Mission-Lock Validator
 * 
 * Validates mission protection safeguards:
 * - Golden share clause in cap table
 * - Auto-expiry language (sunset clause)
 * - Union veto rights on major decisions
 */

import { BlindSpotValidator, ValidationResult, ValidationFinding } from './framework';
import { glob } from 'glob';
import fs from 'fs/promises';

export class GoldenShareValidator extends BlindSpotValidator {
  name = '16. Golden Share Mission-Lock';
  description = 'Validates golden share and mission-lock sunset clauses';
  category = 'governance';

  async validate(): Promise<ValidationResult> {
    const findings: ValidationFinding[] = [];

    const hasGoldenShare = await this.checkGoldenShare();
    const hasSunsetClause = await this.checkSunsetClause();
    const hasVetoRights = await this.checkVetoRights();

    if (!hasGoldenShare) {
      findings.push({
        file: 'docs/governance',
        issue: 'No golden share documentation found',
        severity: 'medium',
      });
    }

    if (!hasSunsetClause) {
      findings.push({
        file: 'docs/governance',
        issue: 'No auto-expiry/sunset clause for mission-lock',
        severity: 'medium',
      });
    }

    if (!hasVetoRights) {
      findings.push({
        file: 'docs/governance',
        issue: 'No union veto rights documentation',
        severity: 'medium',
      });
    }

    if (findings.length > 0) {
      return this.warn(
        `Golden share mission-lock documentation gaps`,
        findings,
        this.generateFix()
      );
    }

    return this.pass('Golden share mission-lock checks passed');
  }

  private async checkGoldenShare(): Promise<boolean> {
    try {
      const files = await glob('docs/**/*{golden-share,cap-table,governance}*.{md,pdf}', {
        cwd: process.cwd(),
        nocase: true,
      });

      for (const file of files) {
        const content = await fs.readFile(file, 'utf-8');
        if (content.match(/golden.share|special.voting.rights|class.b.share/i)) {
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  private async checkSunsetClause(): Promise<boolean> {
    try {
      const files = await glob('docs/**/*.{md,pdf}', {
        cwd: process.cwd(),
      });

      for (const file of files) {
        const content = await fs.readFile(file, 'utf-8');
        if (content.match(/sunset|auto.expiry|time.limit|expire.*after|revert.*ordinary/i)) {
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  private async checkVetoRights(): Promise<boolean> {
    try {
      const files = await glob('docs/**/*.{md,pdf}', {
        cwd: process.cwd(),
      });

      for (const file of files) {
        const content = await fs.readFile(file, 'utf-8');
        if (content.match(/veto.rights?|blocking.rights?|protective.provisions/i)) {
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
// docs/governance/golden-share-mission-lock.md
# Golden Share Mission-Lock Clause

## Purpose
Protect Union Eyes' union-serving mission from investor interference while allowing normal corporate governance.

## Golden Share Structure

### Class B Special Voting Share
- **Holder**: Elected Union Member Representative Council (5 members)
- **Votes**: 1 share = 51% voting power on Reserved Matters only
- **Economic Rights**: $1 redemption value (no profit participation)
- **Transfer**: Non-transferable except to successor Council

### Reserved Matters (Veto Rights)
The Golden Share holder has veto rights over:

1. **Mission Changes**
   - Changing company purpose from union service
   - Serving non-union clients exclusively
   - Employer partnerships that compromise neutrality

2. **Sale/Control Changes**
   - Sale of company (>50% ownership)
   - Merger or acquisition
   - IPO or public listing
   - Change of control transactions

3. **Data Governance**
   - Sharing member data with employers
   - Selling member data to third parties
   - Moving data outside Canada permanently

4. **Major Contracts**
   - Contracts >$1M with employers
   - Exclusive partnerships that limit union choice
   - Technology licensing to anti-union entities

### Non-Reserved Matters (Normal Voting)
Golden Share holder votes as ordinary shareholder on:
- Day-to-day operations
- Hiring/firing executives
- Annual budgets
- Ordinary contracts
- Product roadmap

## Sunset Clause (Auto-Expiry)

### Trigger Events
Golden Share automatically converts to ordinary share if:

1. **Mission Drift (5-year review)**
   - If Union Eyes maintains mission for 5 consecutive years
   - Independent audit confirms union-serving status
   - Member satisfaction >80%
   - **Then**: Golden Share converts, mission-lock expires

2. **Union Control Lost**
   - If union-affiliated ownership drops below 25%
   - Trigger: Golden Share activated to prevent hostile takeover
   - After activation: Mandatory buyback of non-union shares

3. **Bankruptcy/Dissolution**
   - Golden Share reverts to $1 redemption
   - No economic claim on assets

### Rationale for Sunset
- Investors want exit path (not perpetual lock)
- Demonstrates confidence in mission sustainability
- Reduces valuation penalty from permanent restrictions
- Builds trust through time-limited safeguards

## Implementation

### Cap Table
| Shareholder | Class A (Common) | Class B (Golden) | Voting % |
|-------------|------------------|------------------|----------|
| Founder A | 35% | - | 17.15% |
| Founder B | 25% | - | 12.25% |
| Union Council | 15% | 1 share (51% on Reserved) | 58.35% (Reserved) or 7.35% (Normal) |
| Investors | 25% | - | 12.25% |

### Shareholder Agreement Excerpt

> **Section 5: Special Voting Rights**
> 
> The Class B Golden Share held by the Union Member Representative Council shall have:
> - 1% voting power on all matters not listed in Reserved Matters (Section 5.1)
> - 51% voting power on all Reserved Matters (Section 5.2)
> - No economic rights beyond $1 redemption value
> - Non-transferable except to successor Council elected by union members
> 
> **Section 6: Sunset Clause**
> 
> The Class B Golden Share shall automatically convert to Class A Ordinary Share upon:
> - (a) 5 consecutive years of mission compliance (independently audited), OR
> - (b) Written consent of 75% of Class A shareholders
> 
> Upon conversion, all special voting rights terminate and revert to ordinary 1-vote-per-share.

## Legal Opinion

### Canadian Corporate Law Compliance
- ✅ Dual-class share structure permitted (CBCA s.24)
- ✅ Sunset provisions enforceable
- ✅ Veto rights limited to Reserved Matters only
- ✅ No perpetual control (5-year limit)

### Investor Considerations
**Pros**:
- Clear exit path after 5 years
- Limited veto scope (not day-to-day)
- Aligns long-term interests

**Cons**:
- Valuation discount (20-30% typical)
- Longer exit timeline
- Reduced control flexibility

## Governance Process

### Reserved Matter Approval
1. Board proposes transaction
2. Class A shareholders vote (majority required)
3. Union Council votes Class B Golden Share (veto or approve)
4. If vetoed: Transaction blocked
5. If approved: Transaction proceeds

### Annual Mission Review
- Independent auditor assesses mission compliance
- Union member survey (satisfaction, trust metrics)
- Report to Board and Class B holder
- Tracks progress toward 5-year sunset

### Election of Union Council
- Every 2 years, union members elect 5 representatives
- Geographic diversity required
- No more than 1 from same union local
- Terms staggered (continuity)

## Example Scenarios

### Scenario 1: Investor Exit (Year 3)
- Investor wants to sell 10% stake
- **Outcome**: Normal shareholder vote, no Golden Share veto (not Reserved Matter)

### Scenario 2: Acquisition Offer (Year 4)
- Tech company offers to buy Union Eyes
- **Outcome**: Golden Share veto applies, Union Council must approve

### Scenario 3: Sunset Achieved (Year 6)
- 5 years of mission compliance confirmed
- **Outcome**: Golden Share auto-converts, normal governance resumes

---

// lib/services/governance-service.ts (addition)
export class GovernanceService {
  async checkGoldenShareStatus(): Promise<GoldenShareStatus> {
    const goldenShare = await db.query.goldenShares.findFirst({
      where: eq(goldenShares.status, 'active')
    });

    if (!goldenShare) {
      return { exists: false, sunsetEligible: false };
    }

    // Check sunset eligibility (5 years of mission compliance)
    const missionYears = await this.getMissionComplianceYears();
    const sunsetEligible = missionYears >= 5;

    if (sunsetEligible) {
      await this.triggerSunsetClause(goldenShare.id);
    }

    return {
      exists: true,
      holder: goldenShare.holderName,
      yearsActive: missionYears,
      sunsetEligible,
      reservedMatters: goldenShare.reservedMatters,
    };
  }

  async requestReservedMatterVote(
    matter: string,
    description: string
  ): Promise<VoteRequest> {
    // Trigger Golden Share vote for Reserved Matters
    const voteRequest = await db.insert(reservedMatterVotes).values({
      matter,
      description,
      requestedAt: new Date(),
      status: 'pending',
      requiresGoldenShareApproval: true,
    });

    // Notify Union Council (Class B holders)
    await this.notifyGoldenShareHolder(voteRequest.id);

    return voteRequest;
  }

  private async getMissionComplianceYears(): Promise<number> {
    const audits = await db.query.missionAudits.findMany({
      where: eq(missionAudits.compliant, true),
      orderBy: desc(missionAudits.auditYear)
    });

    // Count consecutive compliant years
    let consecutiveYears = 0;
    const currentYear = new Date().getFullYear();
    
    for (let year = currentYear; year >= currentYear - 10; year--) {
      const audit = audits.find(a => a.auditYear === year);
      if (audit && audit.compliant) {
        consecutiveYears++;
      } else {
        break;
      }
    }

    return consecutiveYears;
  }

  private async triggerSunsetClause(goldenShareId: string): Promise<void> {
    // Auto-convert Class B to Class A (ordinary)
    await db.update(goldenShares)
      .set({
        status: 'converted',
        convertedAt: new Date(),
        sunsetReason: '5 years mission compliance achieved'
      })
      .where(eq(goldenShares.id, goldenShareId));

    // Notify all shareholders
    await this.notifyShareholdersSunset();
  }
}

// db/schema/governance-schema.ts (addition)
export const goldenShares = pgTable('golden_shares', {
  id: uuid('id').defaultRandom().primaryKey(),
  shareClass: text('share_class').default('Class B'),
  holderName: text('holder_name').notNull(),
  issuedAt: timestamp('issued_at').notNull(),
  status: text('status').notNull(), // active, converted, expired
  convertedAt: timestamp('converted_at'),
  sunsetReason: text('sunset_reason'),
  reservedMatters: text('reserved_matters').array(),
});

export const reservedMatterVotes = pgTable('reserved_matter_votes', {
  id: uuid('id').defaultRandom().primaryKey(),
  matter: text('matter').notNull(),
  description: text('description'),
  requestedAt: timestamp('requested_at').notNull(),
  votedAt: timestamp('voted_at'),
  status: text('status').notNull(), // pending, approved, vetoed
  vetoReason: text('veto_reason'),
});

export const missionAudits = pgTable('mission_audits', {
  id: uuid('id').defaultRandom().primaryKey(),
  auditYear: integer('audit_year').notNull(),
  auditorName: text('auditor_name').notNull(),
  compliant: boolean('compliant').notNull(),
  memberSatisfaction: numeric('member_satisfaction', { precision: 3, scale: 2 }),
  reportUrl: text('report_url'),
  auditedAt: timestamp('audited_at').notNull(),
});
`;
  }
}
