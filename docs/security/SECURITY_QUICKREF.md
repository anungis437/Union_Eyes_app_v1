# Security Quick Reference

## 🚀 Getting Started (New Developers)

### 1. Initial Setup

```powershell
# Clone the repo
git clone <repo-url>
cd Union_Eyes_app_v1

# Install dependencies
pnpm install

# Set up security tooling
.\scripts\setup-security.ps1

# Copy environment template
cp .env.example .env
# Edit .env with your values (NEVER commit this file!)
```

### 2. Verify Security Setup

```bash
# Check for tracked secrets (should be empty)
git ls-files | Select-String '\.env'

# Run API auth scanner
pnpm tsx scripts/scan-api-auth.ts

# Test pre-commit hook
echo "test" > .env
git add .env
git commit -m "test"  # Should be BLOCKED
git restore --staged .env
```

---

## 🛡️ Daily Development Checklist

### Before Starting Work

- [ ] Pull latest changes: `git pull origin main`
- [ ] Verify `.env` is in `.gitignore`
- [ ] Check `.env` has all required variables

### When Adding New API Routes

- [ ] Wrap handler with `withApiAuth()` (unless public webhook/health check)
- [ ] Add to `PUBLIC_API_ROUTES` if intentionally public
- [ ] Run auth scanner: `pnpm tsx scripts/scan-api-auth.ts`
- [ ] Test route with/without authentication

**Example:**

```typescript
// app/api/my-new-route/route.ts
import { withApiAuth } from '@/lib/api-auth-guard';

export const GET = withApiAuth(async (request, { user, userId }) => {
  // Your logic here - user is already authenticated
  return Response.json({ data: "success" });
});
```

### Before Committing

- [ ] Run `git status` - verify no `.env` files staged
- [ ] Run `git diff --cached` - review changes for secrets
- [ ] Pre-commit hook will auto-check (don't disable it!)
- [ ] If hook blocks commit, investigate and fix

### Before Pushing

- [ ] All tests pass: `pnpm test`
- [ ] TypeScript compiles: `pnpm tsc --noEmit`
- [ ] Build succeeds: `pnpm build`
- [ ] Auth scanner shows no regression

### Before Creating PR

- [ ] CI checks pass (6 security jobs)
- [ ] No merge conflicts
- [ ] PR description mentions security implications (if any)
- [ ] Request security review if touching auth code

---

## 🚨 Common Issues & Solutions

### "Pre-commit hook blocked my commit!"

**Issue:** Tried to commit `.env` file

```
❌ COMMIT REJECTED: .env file detected!
```

**Solution:**

```bash
# Remove from staging
git restore --staged .env

# Verify .env is in .gitignore
cat .gitignore | grep "\.env"

# Commit without .env
git commit -m "your message"
```

---

### "API route returns 401 Unauthorized"

**Issue:** Missing authentication wrapper

**Solution:**

1. Check if route is wrapped with `withApiAuth`:

   ```typescript
   export const GET = withApiAuth(async (request, { user }) => { ... });
   ```

2. If intentionally public (webhook), add to allowlist:

   ```typescript
   // lib/api-auth-guard.ts
   const PUBLIC_API_ROUTES = new Set([
     '/api/webhooks/my-new-webhook',  // Add here
   ]);
   ```

3. Verify Clerk is configured correctly in `.env`:

   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
   CLERK_SECRET_KEY=sk_...
   ```

---

### "CI pipeline failing on secret-scanning"

**Issue:** Gitleaks detected a secret in your commit

**Solution:**

```bash
# View the commit that failed
git show <commit-hash>

# Remove the secret from the file
# Edit the file to use environment variables instead

# Amend the commit
git add .
git commit --amend
git push --force

# If secret is in history, run BFG cleaner (see docs/SECURITY_POSTURE.md §2.2)
```

---

### "API auth coverage check failing"

**Issue:** Added new route without authentication

**Solution:**

```bash
# Run scanner locally
pnpm tsx scripts/scan-api-auth.ts

# Find unprotected routes in output
# Look for section: "⚠️ UNPROTECTED ROUTES:"

# Wrap each route with withApiAuth (see "When Adding New API Routes" above)

# Re-run scanner to verify
pnpm tsx scripts/scan-api-auth.ts
# Should show updated coverage percentage
```

---

### "Docker build failing in CI"

**Issue:** Build depends on local files not in repo

**Solution:**

```dockerfile
# ❌ BAD: Copies from local machine
COPY .next ./.next

# ✅ GOOD: Copies from build stage
COPY --from=builder /app/.next ./.next
```

**Test locally:**

```bash
# Build should succeed using only repo contents
docker build -f Dockerfile -t test:local .
```

---

## 🔐 Security Patterns

### 1. Protecting API Routes (Required)

```typescript
// lib/api-auth-guard.ts provides withApiAuth
import { withApiAuth } from '@/lib/api-auth-guard';

// Authenticated route (most routes)
export const GET = withApiAuth(async (request, { user, userId, params }) => {
  // user and userId are guaranteed to exist
  const data = await fetchUserData(userId);
  return Response.json({ data });
});

// Multiple methods
export const GET = withApiAuth(async (req, { user }) => { ... });
export const POST = withApiAuth(async (req, { user }) => { ... });
export const DELETE = withApiAuth(async (req, { user }) => { ... });
```

### 2. Public Routes (Exceptions Only)

```typescript
// Public routes should be RARE and INTENTIONAL
// Add to PUBLIC_API_ROUTES in lib/api-auth-guard.ts:

const PUBLIC_API_ROUTES = new Set([
  '/api/health',              // Health checks
  '/api/webhooks/clerk',      // External webhooks
  '/api/webhooks/stripe',
  '/api/webhooks/whop',
  '/api/location/anonymous-tracking',  // Truly anonymous endpoints
]);

// Then your route needs NO wrapper:
export async function POST(request: Request) {
  // This is public - validate input carefully!
  const body = await request.json();
  // ... handle webhook
}
```

### 3. Cron Jobs (Special Auth)

```typescript
// Cron jobs use secret header authentication
// Add to CRON_API_ROUTES in lib/api-auth-guard.ts:

const CRON_API_ROUTES = new Set([
  '/api/cron/daily-reports',
]);

// Use withApiAuth - it detects cron routes automatically
export const GET = withApiAuth(async (request) => {
  // x-cron-secret header is validated automatically
  // Runs with system privileges (no user context)
  await generateReports();
  return Response.json({ success: true });
});
```

### 4. Environment Variables (Never Hardcode)

```typescript
// ❌ BAD: Hardcoded secrets
const apiKey = "sk_live_abc123...";
const dbUrl = "postgresql://user:password@host/db";

// ✅ GOOD: Environment variables
const apiKey = process.env.STRIPE_SECRET_KEY;
const dbUrl = process.env.DATABASE_URL;

// ✅ GOOD: Validated at startup
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is required");
}
```

### 5. Database Queries (Use Drizzle ORM)

```typescript
// ❌ BAD: Raw SQL with string interpolation
const query = `SELECT * FROM users WHERE id = ${userId}`;  // SQL INJECTION!

// ✅ GOOD: Drizzle ORM (parameterized)
const user = await db.select().from(users).where(eq(users.id, userId));

// ✅ GOOD: Drizzle with multiple conditions
const results = await db
  .select()
  .from(claims)
  .where(
    and(
      eq(claims.userId, userId),
      eq(claims.status, 'pending')
    )
  );
```

---

## 📊 Security Scanning Commands

### Comprehensive Security Check

```bash
# Run all security checks locally before pushing
pnpm tsx scripts/scan-api-auth.ts   # API auth coverage
pnpm audit --audit-level=high        # Dependency vulnerabilities
pnpm tsc --noEmit                    # Type safety
docker build -f Dockerfile -t test . # Build reproducibility
```

### API Auth Scanner (Detailed Output)

```bash
pnpm tsx scripts/scan-api-auth.ts

# Expected output:
# 🔒 API Route Authentication Coverage Report
# ================================================
# 
# 📊 Summary:
# -----------
# Total API routes found: 373
# ✅ Authenticated routes: 309 (82.8%)
# 🌐 Public routes (intentional): 14
# ⏰ Cron routes: 7
# ⚠️  UNPROTECTED ROUTES: 43
```

### Dependency Audit

```bash
# Check for vulnerabilities
pnpm audit

# Check only high/critical
pnpm audit --audit-level=high

# Auto-fix non-breaking changes
pnpm audit --fix
```

### Secret Detection (Local)

```bash
# Check staged files for secrets (pre-commit does this automatically)
git diff --cached | Select-String -Pattern "(password|secret|api[_-]?key)"

# Check specific file for secrets
Select-String -Path "path/to/file.ts" -Pattern "(AKIA|BEGIN RSA PRIVATE KEY)"

# Check entire repo (slow)
git grep -i "password\|secret\|api_key" -- ':!*.md'
```

---

## 🔧 Troubleshooting Tools

### Check Git Tracking Status

```bash
# List all tracked files (should NOT include .env)
git ls-files

# Check if .env is tracked
git ls-files | Select-String '\.env'

# Check if node_modules is tracked
git ls-files | Select-String 'node_modules/'

# See what's staged for commit
git diff --cached --name-only
```

### Verify .gitignore Works

```bash
# Create test .env file
echo "TEST=123" > .env.test

# Try to add it
git add .env.test
# Should either be ignored or blocked by pre-commit

# Clean up
rm .env.test
git restore --staged .env.test 2>$null
```

### Test Pre-Commit Hook

```bash
# Hook should be at: .git/hooks/pre-commit
Test-Path .git/hooks/pre-commit  # Should be True

# Try committing a .env file (should fail)
echo "test" > .env.fail-test
git add .env.fail-test
git commit -m "test"  # SHOULD BE BLOCKED

# Clean up
git restore --staged .env.fail-test 2>$null
rm .env.fail-test
```

### Check CI Status

```bash
# View recent workflow runs
gh run list --workflow=security-checks.yml

# View specific run details
gh run view <run-id>

# Re-run failed checks
gh run rerun <run-id>
```

---

## 📞 Emergency Contacts

### Security Issues

- **Exposed Secrets:** Immediately notify DevOps team, rotate credentials
- **Unauthorized Access:** Contact security team, audit logs
- **Data Breach Suspected:** Escalate to management immediately

### Code Review Requests

- **Auth Changes:** Require security team review
- **API Changes:** Require backend lead review
- **Dockerfile Changes:** Require DevOps review

### Resources

- **Security Documentation:** `docs/SECURITY_POSTURE.md`
- **API Auth Guard Code:** `lib/api-auth-guard.ts`
- **Setup Script:** `scripts/setup-security.ps1`
- **CI Pipeline:** `.github/workflows/security-checks.yml`

---

## ✅ Security Checklist (Copy for PRs)

```markdown
## Security Checklist
- [ ] No `.env` files or secrets committed
- [ ] All new API routes have authentication (or are in PUBLIC_API_ROUTES)
- [ ] Environment variables used for all sensitive config
- [ ] Database queries use Drizzle ORM (no raw SQL)
- [ ] Pre-commit hook tested and passing
- [ ] CI security checks all pass
- [ ] No new high/critical dependency vulnerabilities
- [ ] TypeScript compiles without errors
- [ ] Security implications documented in PR description
```

---

*Last Updated: 2024-01-XX*  
*For comprehensive security documentation, see: [docs/SECURITY_POSTURE.md](../docs/SECURITY_POSTURE.md)*
