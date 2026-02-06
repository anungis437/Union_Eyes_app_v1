# Branch Merge Plan - Union Eyes App v1
**Generated:** February 6, 2026

## Branch Overview (11 Branches Total)

### 📊 Current State

#### Base Branch
- `main` - Production baseline (current HEAD: 2348b8ca)

#### Development Branches
| Branch | Commits Ahead | Last Updated | Status |
|--------|---------------|--------------|--------|
| **phase-1-foundation** | 162 | Feb 6, 2026 | ✅ Merged to origin |
| **phase-2-enhancement** | 32 | Nov 16, 2025 | ⚠️ Behind by 130 commits |
| **phase-3-validation** | 34 | Dec 5, 2025 | ⚠️ Behind by 128 commits |
| **staging** | 109 | Jan 12, 2026 | ⚠️ Behind by 53 commits |

#### Feature Branches
| Branch | Commits Ahead | Last Updated | Key Features |
|--------|---------------|--------------|--------------|
| **feature/frontend-completion-feb-2026** | 160 | Feb 6, 2026 | ✅ Phase 6 complete |
| **feature/validator-recommendations** | 141 | Feb 6, 2026 | Validator system + P1-P3 |
| **feature/p3-documentation-compliance** | 138 | Feb 6, 2026 | P3 compliance validators |
| **feature/p2-high-impact-compliance** | 135 | Feb 6, 2026 | P2 compliance validators |
| **feature/p1-critical-compliance** | 132 | Feb 5, 2026 | P1 critical compliance |
| **feature/union-blind-spot-validator** | 130 | Feb 5, 2026 | Core validator system |

---

## 🎯 Recommended Merge Strategy

### Phase 1: Merge Latest Development (PRIORITY)
**Goal:** Bring phase-1-foundation's latest work into main

```bash
# phase-1-foundation is 162 commits ahead and already merged to origin
# Contains: frontend-completion-feb-2026 (Phase 6)
git checkout main
git merge origin/phase-1-foundation --no-ff -m "Merge phase-1-foundation: Phase 6 completion"
```

**What this brings:**
- ✅ Analytics dashboards
- ✅ IRV voting system
- ✅ RRULE parser
- ✅ OpenAPI documentation
- ✅ All Phase 6 features

---

### Phase 2: Merge Validator Features
**Goal:** Bring compliance validator system into main

```bash
# Merge validator chain (in order)
git checkout main
git merge origin/feature/union-blind-spot-validator --no-ff
git merge origin/feature/p1-critical-compliance --no-ff
git merge origin/feature/p2-high-impact-compliance --no-ff
git merge origin/feature/p3-documentation-compliance --no-ff
git merge origin/feature/validator-recommendations --no-ff
```

**What this brings:**
- ✅ Union blind spot validator system
- ✅ P1 critical compliance checks
- ✅ P2 high-impact validators
- ✅ P3 documentation validators
- ✅ Validator recommendation engine

---

### Phase 3: Reconcile Staging Branch
**Goal:** Merge staging's admin/role management features

```bash
git checkout main
git merge origin/staging --no-ff -m "Merge staging: Admin role management"
```

**What this brings:**
- ✅ Admin API role management
- ✅ Super admin role fixes
- ✅ Dashboard role resolution

---

### Phase 4: Archive Old Phase Branches
**Goal:** Clean up outdated phase branches

```bash
# These are outdated and superseded by phase-1-foundation
# Archive them or delete after confirming no unique changes
git branch -d phase-2-enhancement
git branch -d phase-3-validation
```

---

## 🔍 Conflict Assessment

### Expected Conflicts
Based on branch divergence analysis:

1. **High Risk Areas:**
   - Authentication/role management (staging vs validators)
   - Database migrations (multiple branches touching schema)
   - API route definitions (overlapping endpoints)

2. **Medium Risk:**
   - Component file structure
   - Configuration files (tsconfig, next.config)
   - Type definitions

3. **Low Risk:**
   - Documentation files
   - Test files
   - README updates

---

## 📋 Pre-Merge Checklist

- [ ] Backup current state: `git tag pre-merge-$(date +%Y%m%d)`
- [ ] Review PR description: [PR_DESCRIPTION.md](./PR_DESCRIPTION.md)
- [ ] Ensure all tests pass on source branches
- [ ] Review database migration order
- [ ] Check for duplicate package dependencies
- [ ] Validate environment variable compatibility

---

## 🎬 Execution Plan

### Step 1: Create Backup
```bash
git tag pre-merge-backup-20260206
git push origin pre-merge-backup-20260206
```

### Step 2: Create Integration Branch
```bash
git checkout -b integrate-all-features
```

### Step 3: Merge in Order
```bash
# 1. Foundation (Phase 6)
git merge origin/phase-1-foundation --no-ff

# 2. Validators (in dependency order)
git merge origin/feature/union-blind-spot-validator --no-ff
git merge origin/feature/p1-critical-compliance --no-ff
git merge origin/feature/p2-high-impact-compliance --no-ff
git merge origin/feature/p3-documentation-compliance --no-ff
git merge origin/feature/validator-recommendations --no-ff

# 3. Staging features
git merge origin/staging --no-ff
```

### Step 4: Test Integration
```bash
npm install
npm run build
npm run test
```

### Step 5: Merge to Main
```bash
git checkout main
git merge integrate-all-features --no-ff
git push origin main
```

---

## 📊 Branch Statistics

### Commit Distribution
```
phase-1-foundation:              162 commits (Phase 6 complete)
feature/frontend-completion:     160 commits (merged into phase-1)
feature/validator-recommendations: 141 commits (validator stack)
feature/p3-documentation:        138 commits
feature/p2-high-impact:          135 commits
feature/p1-critical:             132 commits
feature/union-blind-spot:        130 commits
staging:                         109 commits (admin features)
phase-3-validation:               34 commits (outdated)
phase-2-enhancement:              32 commits (outdated)
main:                            baseline
```

### Date Range
- Oldest unmerged: Nov 16, 2025 (phase-2-enhancement)
- Most recent: Feb 6, 2026 (phase-1-foundation, multiple features)

---

## ⚠️ Important Notes

1. **phase-1-foundation is ALREADY merged** to origin/HEAD
   - This contains the Phase 6 work (frontend-completion-feb-2026)
   - Should be considered the canonical latest state

2. **Validator branches form a chain:**
   - Each builds on the previous
   - Must merge in order to avoid conflicts

3. **staging has unique admin features:**
   - Not present in other branches
   - Needs careful integration testing

4. **phase-2/3 branches are outdated:**
   - Their features are likely in phase-1-foundation
   - Verify before deletion but likely safe to archive

---

## 🎯 Next Steps

1. **Review this plan** with team
2. **Execute backup** (Step 1)
3. **Create integration branch** (Step 2)
4. **Begin merges** in documented order
5. **Test thoroughly** after each merge
6. **Document conflicts** and resolutions
7. **Final integration test** before main merge

---

## 📞 Support

If conflicts arise during merge:
- Check this document for expected conflict areas
- Review individual branch PRs for context
- Use `git log --graph --all` to visualize relationships
- Consult [PR_DESCRIPTION.md](./PR_DESCRIPTION.md) for Phase 6 details
