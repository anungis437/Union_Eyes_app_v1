# ðŸš€ QUICK START - After Production Fixes

> **Status:** âœ… All fixes implemented successfully  
> **Date:** February 6, 2026

## ðŸ“¦ Step 1: Install Dependencies

```bash
pnpm install
```

**New dependencies added:**

- `ioredis` ^5.4.1 - Redis client for notifications
- `node-cron` ^3.0.3 - Job scheduler
- `@types/node-cron` ^3.0.11 - Type definitions

---

## âš™ï¸ Step 2: Configure Environment Variables

### Required Redis Variables

Add to your `.env.local`:

```bash
# Redis for Notification Worker (REQUIRED)
REDIS_HOST=localhost
REDIS_PORT=6379

# Upstash Redis for Distributed Caching (REQUIRED)
UPSTASH_REDIS_REST_URL=https://your-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here
```

### Setup Options

**Option A: Local Redis (Development)**

```bash
# Using Docker (Recommended)
docker run -d --name redis -p 6379:6379 redis:alpine

# Verify it's running
docker ps | grep redis
```

**Option B: Upstash (Production/Staging)**

1. Go to <https://console.upstash.com>
2. Create new Redis database
3. Copy REST URL and Token
4. Add to environment variables

---

## ðŸ§ª Step 3: Verify Installation

### Test 1: Check Environment

```bash
# Start dev server
pnpm dev

# Look for these success messages:
# âœ“ Scheduled daily-aggregation with pattern 0 1 * * *
# âœ“ Scheduled cache-warming with pattern */30 * * * *
# âœ“ Scheduled cache-stats with pattern 0 * * * *
# âœ“ Scheduled db-stats-update with pattern 0 3 * * 0
# âœ“ Scheduled refresh-materialized-views with pattern 0 1 * * *
# âœ“ Scheduled cache-cleanup with pattern 0 */6 * * *
```

### Test 2: Verify Redis Connection

```bash
# Should NOT see these errors:
# âŒ Error: REDIS_HOST is not configured
# âŒ Error: UPSTASH_REDIS_REST_URL must be configured
```

### Test 3: Test Organization Switch API

```bash
# In browser console (must be logged in)
fetch('/api/organizations/switch', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ organizationId: 'your-org-id' })
}).then(r => r.json()).then(logger.info)

# Expected: { success: true, organization: {...}, access: 'direct' }
```

---

## ðŸ“ Step 4: Update Existing Code (Breaking Changes)

### Analytics Cache - Now Async

**Before:**

```typescript
import { analyticsCache, invalidateAnalyticsCache } from '@/lib/analytics-cache';

const data = analyticsCache.get(tenantId, endpoint, params);
analyticsCache.set(tenantId, endpoint, data, params);
invalidateAnalyticsCache(tenantId);
```

**After:**

```typescript
import { analyticsCache, invalidateAnalyticsCache } from '@/lib/analytics-cache';

const data = await analyticsCache.get(tenantId, endpoint, params);
await analyticsCache.set(tenantId, endpoint, data, params);
await invalidateAnalyticsCache(tenantId);
```

### Import Paths - Use @/db

**Deprecated (still works):**

```typescript
import { db } from '@/lib/db';
```

**Preferred:**

```typescript
import { db } from '@/db';
```

---

## ðŸŽ¯ What Was Fixed

| Issue | Status |
|-------|--------|
| Jobs not running | âœ… node-cron integrated |
| Org switching security | âœ… Server-side validation |
| Redis localhost fallback | âœ… Removed, validates at startup |
| In-memory cache | âœ… Now distributed via Redis |
| WebSocket TODO | âœ… Pub/sub implemented |
| Dead auth code | âœ… Removed |
| Type safety issues | âœ… Fixed `as any` bypasses |
| Import confusion | âœ… Documented |

---

## ðŸ” Troubleshooting

### Error: REDIS_HOST is not configured

**Solution:** Add `REDIS_HOST` and `REDIS_PORT` to `.env.local`

### Error: Module has no exported member 'clcGroupsHierarchy'

**Solution:** Already fixed - clear TypeScript cache:

```bash
# Delete .next and restart
rm -rf .next
pnpm dev
```

### Jobs not showing in logs

**Solution:** Jobs only initialize server-side. Check:

1. Not in browser (client-side won't see jobs)
2. Look in terminal where `pnpm dev` is running
3. Search for "Scheduled" in output

### Cache always misses

**Solution:** Verify Upstash credentials:

```bash
# Test Redis connection
curl -H "Authorization: Bearer YOUR_TOKEN" YOUR_URL/get/test-key
```

---

## ðŸ“š Additional Resources

- [Full Implementation Report](./PRODUCTION_FIXES_COMPLETE.md)
- [Environment Configuration Guide](./ENV_CONFIG_GUIDE.md)
- [Original Assessment](./docs/CRITICAL_ASSESSMENT.md) *(if created)*

---

## â˜‘ï¸ Pre-Deployment Checklist

- [ ] `pnpm install` completed
- [ ] Redis configured (local or Upstash)
- [ ] `.env.local` updated with Redis variables
- [ ] Dev server starts without Redis errors
- [ ] Job scheduling logs appear on startup
- [ ] Organization switch API tested
- [ ] Cache operations tested (get/set/invalidate)
- [ ] All TypeScript errors resolved
- [ ] Updated code to use async cache methods

---

**Ready for staging deployment! ðŸŽ‰**

For production deployment, see [PRODUCTION_FIXES_COMPLETE.md](./PRODUCTION_FIXES_COMPLETE.md) for full details.
