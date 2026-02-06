# Union Blind-Spot Validator - Quick Reference

## 🚀 Quick Commands

```bash
# Run all validators
pnpm run validate:blind-spots

# Run by category
pnpm run validate:blind-spots --category=privacy
pnpm run validate:blind-spots --category=taxation

# Run specific validators
pnpm run validate:blind-spots --only=1,2,3,4
```

## 📊 Validator Status (8/16 Complete)

| # | Validator | Status | Category | Risk Level |
|---|-----------|--------|----------|------------|
| 1 | Provincial Privacy | ✅ | privacy | Critical |
| 2 | OQLF Language | ✅ | language | High |
| 3 | Indigenous Data (OCAP®) | ✅ | indigenous-rights | Critical |
| 4 | Strike Fund Tax | ✅ | taxation | Critical |
| 5 | Geofence Privacy | ✅ | privacy | High |
| 6 | Joint-Trust FMV | 🚧 | financial | High |
| 7 | Cyber Insurance | ✅ | security | Critical |
| 8 | Open Source License | ✅ | legal | Critical |
| 9 | ESG Union-Washing | 🚧 | compliance | Medium |
| 10 | Skill Succession | 🚧 | operations | Medium |
| 11 | Founder Conflict | 🚧 | governance | High |
| 12 | Transfer Pricing | ✅ | taxation | High |
| 13 | Force Majeure | 🚧 | security | Critical |
| 14 | LMBP Immigration | 🚧 | legal | Medium |
| 15 | Carbon Exposure | 🚧 | environmental | Low |
| 16 | Golden Share | 🚧 | governance | Medium |

## 📁 File Structure

```
scripts/
├── run-validators.ts              # CLI entry point
└── validators/
    ├── framework.ts                # Base classes
    ├── 01-provincial-privacy.ts    # ✅
    ├── 02-oqlf-language.ts         # ✅
    ├── 03-indigenous-data.ts       # ✅
    ├── 04-strike-fund-tax.ts       # ✅
    ├── 05-geofence-privacy.ts      # ✅
    ├── 07-cyber-insurance.ts       # ✅
    ├── 08-open-source-license.ts   # ✅
    └── 12-transfer-pricing.ts      # ✅
```

## 🔍 What Each Validator Scans

### 1. Provincial Privacy ✅
- `db/schema/**/*.ts` → Province field?
- `lib/services/**/*privacy*.ts` → Privacy handlers?
- `lib/services/**/*breach*.ts` → 72h notification?

### 2. OQLF Language ✅
- `messages/en.json` vs `messages/fr-CA.json` → Coverage?
- `components/**/*.tsx` → Hardcoded strings?
- Quebec French vs France French terminology

### 3. Indigenous Data ✅
- `lib/services/**/*indigenous*.ts` → OCAP® service?
- `.env*` → On-premise DB config?
- `db/schema/**/*.ts` → Band Council consent?

### 4. Strike Fund Tax ✅
- `lib/services/**/*tax*.ts` → T4A/RL-1 service?
- `lib/services/**/*strike*.ts` → $500 threshold?
- Year-end processing logic (Feb 28)?

### 5. Geofence Privacy ✅
- `lib/**/*location*.ts` → Opt-in logic?
- 24-hour retention policy?
- Background tracking safeguards?

### 7. Cyber Insurance ✅
- `docs/**/*insurance*.{md,pdf}` → Policy docs?
- `docs/**/*soc*.{md,pdf}` → SOC-2 cert?

### 8. Open Source License ✅
- `package.json` → Dependencies
- `node_modules/*/package.json` → AGPL/SSPL?

### 12. Transfer Pricing ✅
- `lib/**/*billing*.ts` → CAD enforcement?
- `lib/**/*currency*.ts` → BoC rate logic?
- `lib/**/*t106*.ts` → T106 filing?

## 💡 Common Patterns

### Pass a Validator
```typescript
return this.pass('All checks passed');
```

### Warn (Manual Verification)
```typescript
return this.warn('Manual check needed', findings, fixCode);
```

### Fail with Findings
```typescript
findings.push({
  file: 'path/to/file.ts',
  issue: 'Description',
  severity: 'critical', // or high, medium, low
});
return this.fail('Found issues', findings, fixCode);
```

## 🔧 Adding a New Validator

1. **Create file**: `scripts/validators/NN-name.ts`

```typescript
import { BlindSpotValidator, ValidationResult } from './framework';

export class MyValidator extends BlindSpotValidator {
  name = '99. My Check';
  description = 'What it validates';
  category = 'legal'; // or privacy, taxation, etc.

  async validate(): Promise<ValidationResult> {
    // Your logic
    const hasIssue = await this.checkSomething();
    
    if (hasIssue) {
      return this.fail('Issue found', [], 'Fix code here');
    }
    
    return this.pass('OK');
  }
}
```

2. **Register**: Add to `scripts/run-validators.ts`

```typescript
import { MyValidator } from './validators/99-my-validator';

runner.addValidator(new MyValidator());
```

## 🎯 Exit Codes

- **0** = All passed ✅
- **1** = One or more failed ❌

Use in CI/CD:
```yaml
- run: pnpm run validate:blind-spots
```

## 🏷️ Categories

- `privacy` - Privacy laws, geofence, data protection
- `language` - OQLF, translations
- `indigenous-rights` - OCAP®, Band Council
- `taxation` - T4A, RL-1, T106, CRA compliance
- `security` - Cyber insurance, backups
- `legal` - Licenses, contracts, governance
- `financial` - FMV, transfer pricing
- `compliance` - ESG, audits
- `operations` - Training, succession
- `governance` - Conflicts, golden shares
- `environmental` - Carbon, renewables

## 📝 Output Format

```
🔍 Union Blind-Spot Validator

Running 8 validator(s)...

────────────────────────────────────────────────────────────
✅ 1. Provincial Privacy Mismatch
────────────────────────────────────────────────────────────
All provincial privacy routing appears correctly configured

────────────────────────────────────────────────────────────
❌ 8. Open Source License Contamination
────────────────────────────────────────────────────────────
Found 2 dependencies with viral licenses

Findings:
  [package.json] Viral license: pkg@1.0.0 (AGPL-3.0)

FIX:
pnpm remove pkg

================================================================================
SUMMARY
================================================================================

✅ Passed: 7
❌ Failed: 1

Total: 8 validators
```

## 🔗 Resources

- [Full Implementation Guide](./IMPLEMENTATION.md)
- [Session Summary](./SESSION_SUMMARY.md)
- [Original README](./README.md)

## ⚡ Pro Tips

1. Run validators before every PR
2. Use `--only` to debug specific validators
3. Add to pre-commit hook for critical checks only
4. WARN status doesn't fail builds (manual verification)
5. Each validator includes auto-fix code suggestions

---

**Branch**: `feature/union-blind-spot-validator`  
**Status**: 8/16 validators implemented (50%)  
**Last Updated**: Current session
