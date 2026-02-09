# PR-1: Repo Provenance Gate (Source-Only Builds)

## Summary
Implements repository hygiene enforcement to ensure only source code is tracked in git. This prevents build artifacts from being committed and ensures clean, reproducible builds from source.

## Changes Made

### 1. Enhanced .gitignore
- **File:** `.gitignore`
- **Changes:**
  - Added `.turbo/` and `**/.turbo/` patterns
  - Added `dist/` and `**/dist/` patterns  
  - Added `**/coverage/` and `.cache/` patterns
  - Comprehensive coverage of all build artifacts

### 2. Repository Hygiene Check Script
- **File:** `scripts/check-repo-hygiene.js` (Node.js - cross-platform)
- **File:** `scripts/check-repo-hygiene.sh` (Bash - Linux/macOS/CI)
- **File:** `scripts/check-repo-hygiene.ps1` (PowerShell - Windows alternative)
- **Functionality:**
  - Enumerates all git-tracked files
  - Checks against forbidden patterns (`.next/`, `node_modules/`, `dist/`, `build/`, `.turbo/`, etc.)
  - Reports violations with file counts and examples
  - Exits with code 1 on failure (CI-friendly)
  - Exits with code 0 on success

**Forbidden Patterns:**
```javascript
- ^\.next/
- ^node_modules/
- ^dist/
- ^build/
- ^\.turbo/
- ^\.cache/
- ^coverage/
- ^out/
- \.tsbuildinfo$
- ^\.pnpm-cache/
```

### 3. Package.json Script
- **File:** `package.json`
- **Script:** `"repo:hygiene": "node scripts/check-repo-hygiene.js"`
- **Alternative:** `"repo:hygiene:bash": "bash scripts/check-repo-hygiene.sh"`
- **Usage:** `pnpm repo:hygiene`

### 4. GitHub Actions CI Workflow
- **File:** `.github/workflows/repo-hygiene.yml`
- **Trigger:** Pull requests and pushes to `main` and `develop` branches
- **Job:** Runs `bash scripts/check-repo-hygiene.sh`
- **Failure Behavior:** Fails PR if build artifacts detected

### 5. Cleaned Git Index
- **Action:** Removed 114 tracked `.turbo/` artifacts from git index
- **Command Used:** `git rm --cached -r .turbo/`
- **Files Affected:** `.turbo/cache/*` and `.turbo/cookies/*`
- **Result:** Repository now clean (hygiene check passes)

## Acceptance Criteria ✅

- ✅ **`pnpm repo:hygiene` passes locally** - Verified, exits with code 0
- ✅ **CI fails if artifacts are tracked** - GitHub Action configured with proper exit codes
- ✅ **.gitignore prevents accidental tracking** - Patterns added for all build artifacts
- ✅ **Existing tracked artifacts removed** - 114 .turbo files removed from git index

## Verification

### Local Verification
```bash
# Run hygiene check
pnpm repo:hygiene

# Expected output:
# ✅ PASS: Repository hygiene check passed!
#    No build artifacts are tracked in git.

# Test failure case (temporarily track a build artifact)
touch .next/test.txt
git add .next/test.txt
node scripts/check-repo-hygiene.js
# Should fail with exit code 1

# Clean up test
git reset .next/test.txt
rm .next/test.txt
```

### CI Verification
```bash
# GitHub Actions will run automatically on PR
# Check workflow:
# .github/workflows/repo-hygiene.yml

# To test locally with bash (Linux/macOS/WSL):
bash scripts/check-repo-hygiene.sh
```

## How to Test

1. **Test passing state:**
   ```bash
   pnpm repo:hygiene
   # Should output ✅ PASS
   ```

2. **Test failing state (simulate violation):**
   ```bash
   # Create a test artifact
   mkdir -p .next/test && echo "test" > .next/test/artifact.txt
   git add .next/test/artifact.txt
   
   # Run check
   pnpm repo:hygiene
   # Should output ❌ FAIL with details
   
   # Clean up
   git reset .next/test/artifact.txt
   rm -rf .next/test
   ```

3. **Test GitHub Action (after PR creation):**
   - Create PR with this branch
   - Verify "Repository Hygiene" check appears
   - Verify check passes (green)
   - Push a commit with tracked build artifact
   - Verify check fails (red)

## Files Changed

### New Files
- `scripts/check-repo-hygiene.js` - Main cross-platform hygiene check
- `scripts/check-repo-hygiene.sh` - Bash version for Linux/CI
- `scripts/check-repo-hygiene.ps1` - PowerShell version for Windows
- `.github/workflows/repo-hygiene.yml` - CI workflow
- `docs/LRO_TRANSFORMATION_PR_PLAN.md` - Overall transformation plan

### Modified Files
- `.gitignore` - Enhanced with comprehensive artifact patterns
- `package.json` - Added `repo:hygiene` scripts

### Removed from Git Index
- `.turbo/cache/*` - 114 files removed from tracking

## Impact Assessment

### Breaking Changes
- **None** - Additive changes only

### Benefits
1. **Source Control Hygiene:** Ensures only source code is tracked
2. **Reproducible Builds:** Builds always created from clean source
3. **Repository Size:** Prevents repository bloat from binary artifacts
4. **CI/CD Safety:** Automated enforcement prevents accidental commits
5. **Developer Experience:** Clear error messages with fix instructions

### Risks
- **Minimal** - Scripts are defensive and fail gracefully
- If script fails for unexpected reasons, developers can still commit (not blocking)
- CI workflow is isolated and won't affect other workflows

## Next Steps

After PR-1 is merged:
- **PR-2:** API Policy Enforcement Gate (deny-by-default for API routes)
- **PR-3:** Evidence & Audit Baseline (comprehensive audit logging)

## Documentation

See full transformation plan: `docs/LRO_TRANSFORMATION_PR_PLAN.md`

## Notes

- Scripts are designed to be cross-platform (Node.js, Bash, PowerShell)
- Node.js version (`check-repo-hygiene.js`) is recommended as default for maximum compatibility
- Bash version used in CI for reliability on GitHub Actions Ubuntu runners
- Exit codes are CI-friendly (0 = success, 1 = failure)
- Scripts avoid false positives by using precise regex patterns
