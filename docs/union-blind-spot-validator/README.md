# Union-OS Blind-Spot Validator

## Overview

This validator ensures Union Eyes complies with union-specific legal, privacy, and operational requirements that traditional SaaS audits miss.

## Validation Categories

### 1. Provincial Privacy Compliance

- **Concern**: Different Canadian provinces have distinct privacy laws
- **Risk**: Data breach penalties, member lawsuits
- **Check**: AB PIPA, BC PIPA, QC Law 25, ON PHIPA routing

### 2. Quebec OQLF Language Enforcement

- **Concern**: Bill 96 requires French-first for Quebec operations
- **Risk**: $25,000+ fines, injunctions
- **Check**: 100% fr-CA coverage, OQLF terminology

### 3. Indigenous Data Sovereignty (OCAP®)

- **Concern**: On-reserve data must remain under Band control
- **Risk**: Constitutional challenge, loss of Indigenous membership
- **Check**: On-prem pod, Band Council agreements

### 4. Strike-Fund Taxability

- **Concern**: CRA treats strike pay >$500/week as taxable
- **Risk**: Member tax bills, T4A penalties
- **Check**: Auto T4A/RL-1 generation, gross-up calculator

### 5. Employer Counter-Attack (Geo-fence Spyware)

- **Concern**: Location tracking could be weaponized by employers
- **Risk**: Privacy commissioner investigation, member exodus
- **Check**: Opt-in only, 24h retention, no background tracking

### 6. Joint-Trust Board Fair Market Value

- **Concern**: Must prove arms-length pricing for trust services
- **Risk**: Breach of fiduciary duty, trustee removal
- **Check**: FMV benchmark, CPI escalator, 3-bid process

### 7. Cyber-Insurance Capacity

- **Concern**: $10M primary may be insufficient for 500K+ members
- **Risk**: Uninsured loss, bankruptcy
- **Check**: $50M excess coverage, crypto-ransom rider

### 8. Open-Source License Contamination

- **Concern**: AGPL/SSPL code forces Union Eyes open-source
- **Risk**: Loss of competitive advantage, IP theft
- **Check**: FOSSA scan, GPL block, dual-license CLA

### 9. ESG Union-Washing Accusation

- **Concern**: Employers claim Union Eyes isn't genuinely pro-labor
- **Risk**: Reputational damage, employer boycott
- **Check**: Third-party ESG audit, employer-neutral whitepaper

### 10. Skill-Atrophy / Succession

- **Concern**: New stewards can't use complex features
- **Risk**: Feature abandonment, churn
- **Check**: Auto-onboarding, micro-credentials, VR training

### 11. Founder-Union Conflict

- **Concern**: Founder equity creates criminal breach-of-trust risk
- **Risk**: CLC investigation, founder prosecution
- **Check**: Blind trust, resignation from union office

### 12. Currency & Transfer-Pricing

- **Concern**: USD invoicing triggers transfer-pricing scrutiny
- **Risk**: CRA reassessment, double taxation
- **Check**: CAD denomination, BoC noon rate, T106 filing

### 13. Force-Majeure / Occupation / Data Freeze

- **Concern**: Government could freeze systems during labor unrest
- **Risk**: Data loss, member abandonment
- **Check**: Swiss cold storage, break-glass keys, 48h export drill

### 14. Skill-Based Immigration

- **Concern**: Hiring foreign AI talent requires union LMBP support
- **Risk**: Work permit denial, deportation
- **Check**: Labour Market Benefits Plan, GSS 2-week track

### 15. Carbon Exposure (Scope 2)

- **Concern**: Coal-powered data centers alienate climate-conscious members
- **Risk**: Member boycott, ESG downgrade
- **Check**: Renewable-matched regions, SBTi commitment

### 16. Sunset Over-Confidence (Golden-Share)

- **Concern**: Mission drift after IPO or acquisition
- **Risk**: Union ownership diluted, values abandoned
- **Check**: Mission-lock clause, golden-share auto-expiry

## Usage

Run validators via CLI:

```bash
npm run validate:union-blindspots
```

Or individual checks:

```bash
npm run validate:privacy
npm run validate:language
npm run validate:indigenous
```

## Implementation Status

See `scripts/validators/` for individual check implementations.
