# UnionEyes Performance & Stability Action Plan
**Created**: December 22, 2025  
**Priority**: CRITICAL - Execute Immediately

## 🚨 Current State Assessment

### Critical Issues Identified:
1. **Slow Development Server**: 3-6 seconds per route compilation
2. **High Memory Usage**: Requiring 8GB Node allocation (`--max-old-space-size=8192`)
3. **Schema Mismatches**: Multiple database columns missing causing 500 errors
4. **Monorepo Overhead**: 13 TypeScript configs, 11 packages, 9 services
5. **No Production Caching**: Every request hits database/recomputes

### Terminal Evidence:
```
✓ Compiled /[locale]/dashboard in 5.3s
✓ Compiled /[locale]/dashboard/claims in 3.7s
GET /api/dashboard/stats 200 in 1663ms (should be <100ms)
GET /api/arbitration/precedents 500 - column cited_cases does not exist
```

---

## Phase 1: CRITICAL FIXES (Do Now - 1 Hour)

### Task 1: Fix Schema Mismatches ⚠️ BLOCKING FEATURES
**Impact**: Preventing precedents, analytics, and cross-union features from working

#### Fix 1: arbitrationPrecedents.cited_cases
**Error**: `column arbitrationPrecedents.cited_cases does not exist`

**Location**: `db/schema/arbitration-precedents-schema.ts:64`
```typescript
// CURRENT (Wrong snake_case in schema):
citedCases: uuid("cited_cases").array(),

// ISSUE: Query uses camelCase but column is snake_case
```

**Fix Options**:
A. **Change schema to camelCase** (RECOMMENDED - matches Drizzle conventions):
```typescript
citedCases: uuid("cited_cases").array(), // Keep SQL column name
// Access as: precedent.citedCases
```

B. **Update all API queries** to use snake_case:
```typescript
// In all queries, change:
.select({ citedCases: ... })
// To:
.select({ cited_cases: ... })
```

**RECOMMENDED ACTION**: Option A - schema is correct, find and fix the query


#### Fix 2: organizations.organization_level  
**Error**: `column org.organization_level does not exist`

**Investigation Needed**:
```bash
# Search for where this is queried:
grep -r "organization_level" app/api/analytics/
```

**Likely Fix**: Remove from query or add migration to add missing column


#### Fix 3: cross_org_access_log.resource_owner_org_id
**Error**: `column cross_org_access_log.resource_owner_org_id does not exist`

**Likely Fix**: Check if table exists, add migration if needed

---

### Task 2: Optimize Next.js Configuration (15 mins)

**File**: `next.config.mjs`

Add these performance optimizations:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // ... existing config
  
  // Performance Optimizations
  experimental: {
    // Reduce trace file size
    turbotrace: {
      logLevel: 'error',
      logAll: false,
    },
    // Enable optimized package imports
    optimizePackageImports: [
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      'lucide-react',
      'framer-motion',
      'recharts',
    ],
  },
  
  // Minimize output
  output: 'standalone',
  
  // Faster builds
  swcMinify: true,
  
  // Reduce chunk size
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          framework: {
            chunks: 'all',
            name: 'framework',
            test: /(?<!node_modules.*)[\\/]node_modules[\\/](react|react-dom|scheduler|prop-types)[\\/]/,
            priority: 40,
            enforce: true,
          },
          commons: {
            name: 'commons',
            minChunks: 2,
            priority: 20,
          },
        },
      };
    }
    return config;
  },
};
```

---

## Phase 2: REMOVE DEAD CODE (Do Next - 2 Hours)

### Audit: Services Directory

**Current Structure**:
```
services/
├── ai-service/          ⚠️ DUPLICATE? (lib/ai/ exists)
├── financial-service/   ⚠️ Minimal usage
├── workflow-service/    ⚠️ DUPLICATE? (lib/workflow-automation-engine.ts)
├── clc/
├── compliance/
├── email.ts
├── fcm-service.ts
├── pki/
└── twilio-sms-service.ts
```

#### Investigation Tasks:

1. **Check ai-service usage**:
```bash
grep -r "services/ai-service" app/ lib/ --include="*.ts*"
# If < 5 matches → DELETE
```

2. **Check workflow-service usage**:
```bash
grep -r "services/workflow-service" app/ lib/ --include="*.ts*"
# If duplicate of lib/workflow-automation-engine.ts → DELETE
```

3. **Check financial-service usage**:
```bash
grep -r "services/financial-service" app/ lib/ --include="*.ts*"
# If just pension/arrears → CONSOLIDATE into lib/financial/
```

**Deletion Candidates** (saves ~200MB, reduces TS overhead):
- `services/ai-service/` → Use `lib/ai/` instead
- `services/workflow-service/` → Use `lib/workflow-automation-engine.ts`
- `cba-intelligence/` → Standalone app? Move out of monorepo

---

## Phase 3: CACHING STRATEGY (Do Same Day - 1 Hour)

### 3.1 API Route Caching

**Target Routes** (currently 500-1600ms, should be <100ms):
- `/api/dashboard/stats`
- `/api/activities`
- `/api/deadlines/dashboard`
- `/api/notifications`

**Implementation**:

```typescript
// lib/cache.ts (NEW FILE)
import { unstable_cache } from 'next/cache';

export const getCachedDashboardStats = unstable_cache(
  async (tenantId: string) => {
    // Existing logic from /api/dashboard/stats
    return stats;
  },
  ['dashboard-stats'],
  {
    revalidate: 30, // 30 seconds
    tags: ['dashboard', 'stats'],
  }
);
```

**Update Route**:
```typescript
// app/api/dashboard/stats/route.ts
import { getCachedDashboardStats } from '@/lib/cache';

export async function GET(request: NextRequest) {
  const tenantId = await getTenantIdForUser();
  const stats = await getCachedDashboardStats(tenantId);
  return NextResponse.json(stats);
}
```

### 3.2 SWR Configuration

```typescript
// app/layout.tsx
import { SWRConfig } from 'swr';

<SWRConfig value={{
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  dedupingInterval: 5000,
  fetcher: (url) => fetch(url).then(r => r.json()),
}}>
  {children}
</SWRConfig>
```

---

## Phase 4: BUILD OPTIMIZATION (Do Next Day - 1 Hour)

### 4.1 TypeScript Configuration

**File**: `tsconfig.json`

```json
{
  "compilerOptions": {
    // Performance optimizations
    "incremental": true,
    "skipLibCheck": true,
    "skipDefaultLibCheck": true,
    
    // Faster builds
    "isolatedModules": true,
    "verbatimModuleSyntax": true
  }
}
```

### 4.2 Package Cleanup

**Check Unused Dependencies**:
```bash
npx depcheck
```

**Likely Removals** (saves ~50MB):
- `@remotion/*` (if not using video generation)
- Duplicate PDF libraries (`jspdf` + `@react-pdf/renderer` + `pdf-lib`)
- Unused chart libraries if using only one

---

## Phase 5: MONITORING (Ongoing)

### Add Performance Logging

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const start = Date.now();
  
  // ... existing logic
  
  const duration = Date.now() - start;
  if (duration > 500) {
    console.warn(`SLOW REQUEST: ${request.url} took ${duration}ms`);
  }
}
```

---

## Expected Results After Implementation

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Dev Server Compile | 3-6s | 1-2s | **50-67% faster** |
| API Response Time | 500-1600ms | 50-200ms | **70-90% faster** |
| Memory Usage | 8GB | 4GB | **50% reduction** |
| Build Time | ~10min | ~5min | **50% faster** |
| node_modules Size | ~2GB | ~1.5GB | **25% reduction** |

---

## Execution Order (Today)

1. ✅ **10:00 AM** - Fix schema errors (30 mins) → **UNBLOCKS FEATURES**
2. ✅ **10:30 AM** - Update next.config.mjs (15 mins) → **REDUCES MEMORY**
3. ✅ **10:45 AM** - Test member bulk import (30 mins) → **VERIFY NEW FEATURE**
4. ✅ **11:15 AM** - Audit services/ directory (1 hour) → **IDENTIFY DELETIONS**
5. ✅ **12:15 PM** - Add caching to top 4 API routes (1 hour) → **MAJOR SPEEDUP**
6. ⏰ **Tomorrow** - Build optimization + package cleanup

---

## Risk Mitigation

**Before Any Changes**:
```bash
# Create safety branch
git checkout -b perf-optimization-dec22
git commit -am "Checkpoint before performance fixes"
```

**Test After Each Phase**:
```bash
pnpm dev
# Visit: http://localhost:3000/dashboard
# Verify: No console errors, pages load
```

---

## Success Metrics

Track these before/after:
- [ ] Dashboard loads in <2s
- [ ] No 500 errors on precedents page
- [ ] Memory usage stays below 4GB
- [ ] API routes respond in <200ms
- [ ] Build completes in <6 minutes

---

## Notes from Terminal Analysis

**Compilation Bottlenecks**:
- `/[locale]/dashboard/cross-union-analytics` → 9.4s (WORST)
- `/[locale]/dashboard/claims/[id]` → 6.9s
- `/[locale]/dashboard` → 5.3s

**API Performance Issues**:
- Profile lookup called 20+ times per page load (cache this!)
- `getTenantIdForUser` logs show excessive cookie parsing
- Every stats request queries database (add caching!)

**Schema Issues Blocking**:
- Precedents page completely broken
- Analytics page throwing errors
- Cross-union features non-functional
