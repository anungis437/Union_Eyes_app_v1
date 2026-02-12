# Performance Optimization Quick Reference 🚀

**Last Updated:** 2026-02-13  
**Status:** Production Ready ✅

---

## 🎯 Quick Start

### Bundle Analysis
```bash
# Analyze bundle size
ANALYZE=true pnpm build

# Review reports
# - Client: .next/analyze/client.html
# - Server: .next/analyze/server.html
```

### API Route Caching
```typescript
import { withApiCache } from '@/lib/services/api-cache';

export async function GET(request: NextRequest) {
  return withApiCache(request, async () => {
    const data = await fetchData();
    return NextResponse.json(data);
  }, {
    revalidate: 300,              // 5 minutes
    staleWhileRevalidate: 60,     // 1 minute stale
    tags: ['resource-name']
  });
}
```

### Query Monitoring
```typescript
import { withQueryMonitoring } from '@/lib/db/query-performance-monitor';

const users = await withQueryMonitoring(
  'getUsersByOrg',
  () => db.query.users.findMany({ where: eq(users.orgId, id) })
);
```

### Cache Warming
```typescript
import { registerCacheWarmup, executeCacheWarmup } from '@/lib/services/cache-service';

// Register
registerCacheWarmup({
  key: 'organizations:all',
  fetchFn: () => db.query.organizations.findMany(),
  ttl: 300,
  priority: 1
});

// Execute
await executeCacheWarmup({ parallel: 3, priorityOnly: 2 });
```

### Static Generation
```typescript
// app/public/[slug]/page.tsx
export const revalidate = 300;  // 5 minutes
export const dynamicParams = true;

export async function generateStaticParams() {
  const items = await fetchTopItems();
  return items.map(item => ({ slug: item.slug }));
}
```

---

## 📋 Recommended Cache Times

| Resource Type | Revalidate | Rationale |
|--------------|------------|-----------|
| User roles/permissions | 300s (5m) | Infrequent changes, security critical |
| Organizations list | 300s (5m) | Moderate change frequency |
| Regional data | 3600s (1h) | Rarely changes |
| Static content | 86400s (24h) | Legal pages, terms |
| Dashboard stats | 60s (1m) | Real-time feel, acceptable delay |
| Public API stats | 900s (15m) | Balance freshness and performance |

---

## 🎯 When to Use Each Pattern

### Use `withApiCache` When:
✅ GET endpoints with stable data  
✅ Public APIs  
✅ High-traffic endpoints  
✅ Database queries that can be cached  

❌ **Don't Use For:**
- POST/PUT/DELETE requests
- User-specific data
- Real-time data
- Authentication endpoints

### Use `withQueryMonitoring` When:
✅ Complex joins  
✅ Large table scans  
✅ Aggregation queries  
✅ User-facing queries  

### Use Cache Warming For:
✅ Frequently accessed data  
✅ Expensive queries  
✅ Data with stable keys  
✅ Reference data (regions, roles, etc.)  

### Use Static Generation For:
✅ Public marketing pages  
✅ Documentation  
✅ Blog posts  
✅ Product listings  
✅ Terms/privacy pages  

---

## 🚨 Performance Thresholds

### Query Performance
- **Target:** <50ms for simple queries
- **Warning:** >100ms (logged automatically)
- **Critical:** >500ms (requires investigation)
- **Maximum:** 1000ms (refactor required)

### API Response Times
- **Target:** <100ms (cached)
- **Acceptable:** <300ms (database)
- **Warning:** >500ms
- **Critical:** >1000ms

### Cache Hit Rates
- **Target:** >80% for stable data
- **Minimum:** >60% for mixed workloads
- **Investigation:** <50%

### Bundle Size
- **Target:** <200KB initial
- **Warning:** >500KB
- **Critical:** >1MB

---

## 🔧 Common Optimizations

### High-Traffic API Route
```typescript
// Before
export async function GET() {
  const data = await db.query.organizations.findMany();
  return NextResponse.json(data);
}

// After
export async function GET(request: NextRequest) {
  return withApiCache(request, async () => {
    const data = await db.query.organizations.findMany();
    return NextResponse.json(data);
  }, {
    revalidate: 300,
    staleWhileRevalidate: 60
  });
}
```

### Slow Query
```typescript
// Before
const users = await db.query.users.findMany({
  where: eq(users.organizationId, orgId)
});

// After
const users = await withQueryMonitoring(
  'getUsersByOrg',
  () => db.query.users.findMany({
    where: eq(users.organizationId, orgId)
  })
);
// Now automatically logged if > 100ms
```

### Cold Start
```typescript
// Before: First request slow

// After: Pre-warm critical data
registerCacheWarmup({
  key: 'critical-data',
  fetchFn: () => fetchCriticalData(),
  ttl: 300,
  priority: 1
});

await executeCacheWarmup();
// Now first request fast
```

### Public Page
```typescript
// Before: Server-rendered every time
export default async function Page() {
  const data = await fetchData();
  return <Content data={data} />;
}

// After: Static with revalidation
export const revalidate = 300;
export const dynamic = 'force-static';

export default async function Page() {
  const data = await fetchData();
  return <Content data={data} />;
}
```

---

## 📊 Monitoring Commands

### Check Query Performance
```typescript
import { getQueryPerformanceSummary } from '@/lib/db/query-performance-monitor';
const summary = getQueryPerformanceSummary();
console.log('Summary:', summary);
```

### Check Cache Stats
```typescript
import { getCacheStats } from '@/lib/services/cache-service';
const stats = await getCacheStats();
console.log('Hit rate:', stats.hitRate);
```

### Check Connection Pool
```typescript
import { getConnectionPoolStats } from '@/lib/db/connection-pool-monitor';
const stats = await getConnectionPoolStats();
console.log('Utilization:', stats.utilizationPercent);
```

### Get Slow Queries
```typescript
import { getRecentSlowQueries } from '@/lib/db/query-performance-monitor';
const slowQueries = getRecentSlowQueries(10);
slowQueries.forEach(q => {
  console.log(`${q.query}: ${q.durationMs}ms - ${q.recommendation}`);
});
```

---

## 🎨 Route Segment Config Templates

### Marketing Page
```typescript
export const revalidate = 3600;          // 1 hour
export const dynamic = 'force-static';
export const dynamicParams = true;
export const fetchCache = 'force-cache';
```

### Public Directory
```typescript
export const revalidate = 300;           // 5 minutes
export const dynamic = 'auto';
export const dynamicParams = true;
export const fetchCache = 'default-cache';
```

### User Dashboard
```typescript
export const revalidate = 0;             // No cache
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
```

---

## 🐛 Debugging Tips

### Cache Not Working?
1. Check Redis connection: `await pingRedis()`
2. Verify cache key: Console log the key
3. Check TTL: Ensure it hasn't expired
4. Review namespace: Correct namespace?

### Slow Queries?
1. Check indexes: `EXPLAIN ANALYZE`
2. Review query plan: Look for seq scans
3. Check patterns: `getQueryPatterns('avgDuration')`
4. Add monitoring: Wrap with `withQueryMonitoring`

### Bundle Too Large?
1. Run analyzer: `ANALYZE=true pnpm build`
2. Check dependencies: Look for duplicate packages
3. Code split: Use dynamic imports
4. Tree shake: Ensure proper imports

### Static Generation Not Working?
1. Check config: Verify `revalidate` value
2. Review logs: Build time vs runtime
3. Test locally: `pnpm build && pnpm start`
4. Check headers: Look for `Cache-Control`

---

## 📱 Mobile Optimizations

### Route Prefetching
```typescript
import Link from 'next/link';

<Link href="/organizations" prefetch={true}>
  Organizations
</Link>
```

### Image Optimization
```typescript
import Image from 'next/image';

<Image
  src="/logo.png"
  alt="Logo"
  width={200}
  height={50}
  priority  // Above fold
  quality={85}
/>
```

### Font Loading
```typescript
// app/layout.tsx
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  preload: true
});
```

---

## ⚡ Performance Checklist

### Before Deploy
- [ ] Run bundle analysis
- [ ] Check slow query logs
- [ ] Verify cache hit rates
- [ ] Test cache warming
- [ ] Review static page generation
- [ ] Check image optimization
- [ ] Verify font loading
- [ ] Test mobile performance

### After Deploy
- [ ] Monitor response times (first 24h)
- [ ] Check error rates
- [ ] Verify cache hit rates
- [ ] Review slow queries
- [ ] Check bundle size in production
- [ ] Monitor memory usage
- [ ] Test edge cases

---

## 📚 Learn More

| Topic | File | Description |
|-------|------|-------------|
| API Caching | [lib/services/api-cache.ts](lib/services/api-cache.ts) | API route caching utilities |
| Query Monitoring | [lib/db/query-performance-monitor.ts](lib/db/query-performance-monitor.ts) | Slow query detection |
| Cache Service | [lib/services/cache-service.ts](lib/services/cache-service.ts) | Core caching + warming |
| Static Patterns | [lib/examples/static-generation-patterns.ts](lib/examples/static-generation-patterns.ts) | SSG/ISR examples |
| Full Guide | [PERFORMANCE_OPTIMIZATION_IMPLEMENTATION.md](PERFORMANCE_OPTIMIZATION_IMPLEMENTATION.md) | Complete documentation |

---

## 🎯 Performance Goals

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Page Load | TBD | <2s | 🟡 Test |
| Time to Interactive | TBD | <3s | 🟡 Test |
| API Response (cached) | TBD | <100ms | ✅ Ready |
| API Response (DB) | TBD | <300ms | ✅ Ready |
| Bundle Size | TBD | <200KB | 🟡 Analyze |
| Cache Hit Rate | TBD | >80% | 🟡 Monitor |

---

**Quick Reference Card - Keep This Handy! 📌**
