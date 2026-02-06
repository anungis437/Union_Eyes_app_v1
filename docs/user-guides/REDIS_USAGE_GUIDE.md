# Redis Usage Guide

**UnionEyes Redis Backend Documentation**  
**Provider:** Upstash Redis (Serverless-optimized)  
**Last Updated:** February 6, 2026

---

## Overview

UnionEyes uses Redis for two primary functions:

1. **Rate Limiting** - Protect expensive operations (AI, exports, auth)
2. **Analytics Performance Tracking** - Monitor query performance with persistence

Both systems share the **same Redis instance** for cost efficiency and simplified configuration.

---

## Quick Start

### 1. Get Upstash Redis Credentials

**Create Account & Database:**
```bash
# Visit https://upstash.com
# Create a free account
# Create a new Redis database
# Choose region closest to your deployment
```

**Get Credentials:**
- Navigate to your database
- Copy REST API credentials:
  - REST URL: `https://[database-id].upstash.io`
  - REST Token: `AXXXabc...`

### 2. Configure Environment

Add to `.env.local` (development) and production environment:

```bash
# Required: Upstash Redis credentials
UPSTASH_REDIS_REST_URL=https://your-database.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXXXabc123...

# Optional: Analytics retention (default: 30 days)
ANALYTICS_RETENTION_DAYS=30
```

### 3. Verify Configuration

```bash
# Test health endpoint
curl http://localhost:3000/api/health

# Should show Redis as healthy
{
  "checks": [
    {
      "name": "redis",
      "status": "healthy",
      "responseTime": 45,
      "details": {
        "configured": true,
        "provider": "upstash"
      }
    }
  ]
}
```

---

## Feature 1: Rate Limiting

**File:** `lib/rate-limiter.ts`

### Purpose

Protect expensive operations from abuse:
- AI query endpoints (Azure OpenAI costs)
- ML prediction services
- Voice transcription (Azure Speech API)
- Export generation (CPU intensive)
- Authentication endpoints (brute force prevention)

### Architecture

**Algorithm:** Sliding window rate limiting  
**Storage:** Redis sorted sets (timestamp-scored entries)  
**Expiration:** Automatic TTL on keys  
**Fallback:** Fail-open if Redis unavailable (logs warning)

### Preset Rate Limits

```typescript
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';

// AI Query: 20 requests per hour per user
RATE_LIMITS.AI_QUERY              // { limit: 20, window: 3600, identifier: 'ai-query' }

// ML Predictions: 50 per hour per user
RATE_LIMITS.ML_PREDICTIONS        // { limit: 50, window: 3600 }

// Voice Transcription: 100 per hour per user
RATE_LIMITS.VOICE_TRANSCRIPTION   // { limit: 100, window: 3600 }

// Exports: 50 per hour per organization
RATE_LIMITS.EXPORTS               // { limit: 50, window: 3600 }

// Webhooks: 1000 per 5 minutes per IP
RATE_LIMITS.WEBHOOKS              // { limit: 1000, window: 300 }

// Authentication: 5 per 15 minutes per IP
RATE_LIMITS.AUTH                  // { limit: 5, window: 900 }

// Sign-up: 3 per hour per IP
RATE_LIMITS.SIGNUP                // { limit: 3, window: 3600 }
```

### Usage Examples

#### Basic Rate Limiting

```typescript
// In API route
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';

export async function POST(req: NextRequest) {
  const userId = getCurrentUserId();
  
  // Check rate limit
  const result = await checkRateLimit(userId, RATE_LIMITS.AI_QUERY);
  
  if (!result.allowed) {
    return NextResponse.json(
      { 
        error: 'Rate limit exceeded',
        message: `Too many requests. Try again in ${result.resetIn} seconds.`,
        resetIn: result.resetIn,
      },
      { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': result.limit.toString(),
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': result.resetIn.toString(),
          'Retry-After': result.resetIn.toString(),
        }
      }
    );
  }
  
  // Process request
  const aiResponse = await callAzureOpenAI();
  return NextResponse.json(aiResponse);
}
```

#### Custom Rate Limit

```typescript
// Custom configuration for specific endpoint
const customLimit = {
  limit: 10,             // 10 requests
  window: 60,            // per minute
  identifier: 'custom-endpoint',
};

const result = await checkRateLimit(userId, customLimit);
```

#### Per-Organization Rate Limiting

```typescript
// Rate limit by organization instead of user
const organizationId = getCurrentOrganizationId();

const result = await checkRateLimit(
  organizationId,
  RATE_LIMITS.EXPORTS
);
```

#### IP-Based Rate Limiting

```typescript
// Rate limit by IP (for auth endpoints)
const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';

const result = await checkRateLimit(
  ip,
  RATE_LIMITS.AUTH
);
```

### Redis Key Pattern

Rate limiting uses sorted sets:

```
ratelimit:{identifier}:{key}
```

**Examples:**
- `ratelimit:ai-query:user_123` - AI queries for user_123
- `ratelimit:exports:org_456` - Exports for organization 456
- `ratelimit:auth:192.168.1.1` - Auth attempts from IP

**Data Structure:**
```typescript
// Sorted set with timestamp scores
ZADD ratelimit:ai-query:user_123 1738848000123 "1738848000123-0.123456"
ZADD ratelimit:ai-query:user_123 1738848012456 "1738848012456-0.789012"

// Automatic expiry (window + 10 seconds buffer)
EXPIRE ratelimit:ai-query:user_123 3610
```

---

## Feature 2: Analytics Performance Tracking

**File:** `lib/analytics-performance.ts`

### Purpose

Track query performance to:
- Identify slow queries
- Monitor cache hit rates
- Track tenant-specific performance
- Generate optimization reports

### Architecture

**Storage:** Redis sorted sets, hashes, and sets  
**Retention:** 30 days (configurable via `ANALYTICS_RETENTION_DAYS`)  
**Partitioning:** Date-based keys for efficient queries  
**Expiration:** Automatic TTL on all keys

### Recording Metrics

```typescript
import { performanceMonitor } from '@/lib/analytics-performance';

// Record a query execution
await performanceMonitor.recordQuery(
  '/api/analytics/queries',  // endpoint
  245,                        // duration in ms
  false,                      // cached
  'org_123'                   // tenantId
);
```

### Using Performance Tracking Middleware

```typescript
import { withPerformanceTracking } from '@/lib/analytics-performance';

// Wrap expensive queries
export async function getAnalyticsData(tenantId: string) {
  return await withPerformanceTracking(
    '/api/analytics/queries',
    tenantId,
    false, // Not cached
    async () => {
      // Your expensive query
      return await db.query(sql`SELECT * FROM analytics_data`);
    }
  );
}
```

### Querying Analytics

#### Get Endpoint Report

```typescript
// Get performance report for specific endpoint
const report = await performanceMonitor.getEndpointReport('/api/analytics/queries');

console.log({
  endpoint: report.endpoint,
  totalCalls: report.totalCalls,
  avgDuration: report.avgDuration,          // Average query time
  minDuration: report.minDuration,          // Fastest query
  maxDuration: report.maxDuration,          // Slowest query
  cacheHitRate: report.cacheHitRate,        // 0-1 (0.8 = 80% cached)
  slowQueries: report.slowQueries,          // Count >1000ms
});
```

#### Get All Endpoint Reports

```typescript
// Get reports for all endpoints (sorted by slowest first)
const allReports = await performanceMonitor.getAllReports();

allReports.forEach(report => {
  console.log(`${report.endpoint}: ${report.avgDuration}ms avg`);
});
```

#### Get Slow Queries

```typescript
// Get top 10 slowest queries
const slowQueries = await performanceMonitor.getSlowQueries(10);

slowQueries.forEach(query => {
  console.log({
    endpoint: query.endpoint,
    duration: query.duration,
    timestamp: query.timestamp,
    tenantId: query.tenantId,
  });
});
```

#### Get Tenant-Specific Metrics

```typescript
// Get all queries for a specific tenant
const tenantMetrics = await performanceMonitor.getTenantMetrics('org_123');

console.log(`Tenant made ${tenantMetrics.length} queries`);
```

#### Get Daily Summary

```typescript
// Get summary for today
const summary = await performanceMonitor.getSummary();

console.log({
  totalQueries: summary.totalQueries,
  avgDuration: summary.avgDuration,
  medianDuration: summary.medianDuration,
  p95Duration: summary.p95Duration,         // 95th percentile
  p99Duration: summary.p99Duration,         // 99th percentile
  cacheHitRate: summary.cacheHitRate,
  slowQueryRate: summary.slowQueryRate,
  uniqueEndpoints: summary.uniqueEndpoints,
  uniqueTenants: summary.uniqueTenants,
});

// Get summary for specific date
const pastSummary = await performanceMonitor.getSummary('2026-02-01');
```

#### Export All Metrics

```typescript
// Export everything for monitoring dashboard
const exported = await performanceMonitor.exportMetrics();

console.log({
  summary: exported.summary,              // Daily summary
  endpointReports: exported.endpointReports,  // All endpoint reports
  slowQueries: exported.slowQueries,      // Top 20 slow queries
  enabled: exported.enabled,              // Redis configured?
  retentionDays: exported.retentionDays,  // Retention period
});
```

### Redis Key Patterns

Analytics uses multiple data structures:

#### 1. Endpoint Metrics (Sorted Set)
```
analytics:metrics:{endpoint}:{date}
```
Example: `analytics:metrics:/api/analytics/queries:2026-02-06`

#### 2. Slow Queries (Sorted Set)
```
analytics:slow:{date}
```
Example: `analytics:slow:2026-02-06`

#### 3. Daily Summary (Hash)
```
analytics:summary:{date}
```
Fields: `totalQueries`, `totalDuration`, `cachedQueries`, `slowQueries`

#### 4. Unique Endpoints (Set)
```
analytics:endpoints:{date}
```

#### 5. Unique Tenants (Set)
```
analytics:tenants:{date}
```

#### 6. Tenant-Specific Metrics (Sorted Set)
```
analytics:tenant:{tenantId}:{date}
```
Example: `analytics:tenant:org_123:2026-02-06`

---

## Health Check Integration

**Endpoint:** `/api/health`

Redis health is checked automatically:

```bash
curl http://localhost:3000/api/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-02-06T12:00:00.000Z",
  "checks": [
    {
      "name": "database",
      "status": "healthy",
      "responseTime": 45
    },
    {
      "name": "redis",
      "status": "healthy",
      "responseTime": 28,
      "details": {
        "configured": true,
        "provider": "upstash"
      }
    }
  ]
}
```

**Status Codes:**
- `200 OK` - Redis healthy (response time < 200ms)
- `200 OK` with `degraded` - Redis slow (response time > 200ms)
- `503 Service Unavailable` - Redis failed or not configured

---

## Graceful Degradation

Both rate limiting and analytics degrade gracefully without Redis:

### Rate Limiting Fallback
```typescript
if (!redis) {
  logger.warn('Redis not configured for rate limiting - allowing request');
  return {
    allowed: true,
    current: 0,
    limit,
    remaining: limit,
    resetIn: window,
  };
}
```

**Behavior:** All requests allowed, warnings logged

### Analytics Fallback
```typescript
if (!redis) {
  logger.warn('Redis not configured - analytics disabled');
}
```

**Behavior:** Recording silently fails, queries return empty/null

---

## Performance Characteristics

### Latency

**Rate Limiting:**
- Single check: ~20-50ms (Redis REST API)
- Adds minimal overhead to API requests
- Non-blocking on failure

**Analytics:**
- Recording: Fire-and-forget (0ms blocking)
- Queries: ~50-200ms depending on data size
- Reports: ~100-500ms for full endpoint aggregation

### Throughput

**Upstash Limits:**
- Free tier: 10,000 commands/day
- Pro tier: 1M commands/day included
- Pay-as-you-go: $0.20 per 100K commands

**Estimated Usage:**
- Rate limit check: 1 command per API request
- Analytics recording: 8-10 commands per query
- 10K API requests/day = ~100K Redis commands
- Cost: ~$0.20/day ($6/month) or included in Pro

### Storage

**Rate Limiting:**
- Minimal: ~1KB per active rate limit bucket
- Auto-expires with TTL (no accumulation)

**Analytics:**
- ~200 bytes per recorded metric
- 10K queries/day × 200 bytes × 30 days = ~60 MB
- Upstash free tier: 256 MB storage (plenty)

---

## Monitoring & Debugging

### Upstash Dashboard

Access at [console.upstash.com](https://console.upstash.com)

**Features:**
- Real-time metrics (requests/sec, latency)
- Data browser (inspect keys and values)
- Command history
- Performance graphs
- Cost tracking
- Alerts configuration

### Inspect Keys

```bash
# Using Upstash CLI or dashboard
KEYS analytics:*              # All analytics keys
KEYS ratelimit:*              # All rate limit keys

ZRANGE analytics:slow:2026-02-06 0 -1 WITHSCORES  # Slow queries with durations
HGETALL analytics:summary:2026-02-06              # Daily summary

ZRANGE ratelimit:ai-query:user_123 0 -1           # User's rate limit entries
```

### Debug Rate Limiting

```typescript
// Check current rate limit status
const result = await checkRateLimit(userId, RATE_LIMITS.AI_QUERY);

console.log({
  allowed: result.allowed,
  current: result.current,        // Current request count
  limit: result.limit,            // Max allowed
  remaining: result.remaining,    // Requests left
  resetIn: result.resetIn,        // Seconds until reset
});
```

### Debug Analytics

```typescript
// Check if analytics are being recorded
const summary = await performanceMonitor.getSummary();

if (!summary) {
  console.log('No metrics recorded today - check Redis configuration');
} else {
  console.log(`Recorded ${summary.totalQueries} queries today`);
}
```

---

## Cost Optimization

### 1. Use Appropriate Retention

```bash
# Shorter retention = less storage cost
ANALYTICS_RETENTION_DAYS=7   # Only keep 1 week (vs default 30 days)
```

### 2. Sample High-Volume Endpoints

```typescript
// Sample 10% of high-volume queries
if (Math.random() < 0.1) {
  await performanceMonitor.recordQuery(/* ... */);
}
```

### 3. Rate Limit Less Aggressively

```typescript
// Increase limits to reduce Redis commands
const relaxedLimit = {
  limit: 100,      // Instead of 20
  window: 3600,
  identifier: 'ai-query',
};
```

### 4. Use Free Tier

Upstash free tier is sufficient for:
- Small deployments (<1000 users)
- Development/staging environments
- Prototypes and MVPs

---

## Production Checklist

### ✅ Required Configuration

- [ ] `UPSTASH_REDIS_REST_URL` set in production environment
- [ ] `UPSTASH_REDIS_REST_TOKEN` set in production environment
- [ ] Redis health check passing (`/api/health`)
- [ ] Rate limiting tested on critical endpoints
- [ ] Analytics recording validated

### ✅ Recommended Configuration

- [ ] `ANALYTICS_RETENTION_DAYS` configured (default: 30)
- [ ] Upstash region matches deployment region
- [ ] Upstash alerts configured (latency, errors)
- [ ] Monitoring dashboard set up
- [ ] Backup plan documented

### ✅ Optional Enhancements

- [ ] Multi-region Redis replication (Upstash Global)
- [ ] Custom rate limits per tenant tier
- [ ] Grafana/Prometheus integration
- [ ] Automated analytics reports

---

## Troubleshooting

### Issue: "Redis not configured" Warning

**Symptoms:** Logs show `Redis not configured` warnings

**Solution:**
1. Check environment variables are set:
   ```bash
   echo $UPSTASH_REDIS_REST_URL
   echo $UPSTASH_REDIS_REST_TOKEN
   ```
2. Verify variables are not empty strings
3. Restart application after setting variables

### Issue: Rate Limiting Not Working

**Symptoms:** All requests pass through, no 429 responses

**Solution:**
1. Check `/api/health` shows Redis as healthy
2. Verify `checkRateLimit` is actually being called
3. Check logs for rate limit warnings
4. Test with low limit (e.g., 1 request per minute)

### Issue: No Analytics Data

**Symptoms:** `getSummary()` returns null, no metrics visible

**Solution:**
1. Verify `recordQuery()` is being called (add log)
2. Check Redis health endpoint
3. Inspect Redis keys in Upstash dashboard:
   ```bash
   KEYS analytics:summary:*
   ```
4. Verify date format (YYYY-MM-DD)

### Issue: High Latency

**Symptoms:** Slow API responses, Redis commands timing out

**Solution:**
1. Check Upstash region (should match deployment)
2. Upgrade to Pro tier (higher performance)
3. Enable multi-region replication
4. Reduce data retention period

### Issue: Cost Higher Than Expected

**Symptoms:** Unexpected Upstash charges

**Solution:**
1. Check command count in Upstash dashboard
2. Reduce analytics retention:
   ```bash
   ANALYTICS_RETENTION_DAYS=7
   ```
3. Sample high-volume endpoints (don't record every query)
4. Review rate limit configurations (too aggressive?)

---

## Migration Guide

### From No Redis to Redis-Enabled

**Before:** Application works without Redis (graceful degradation)  
**After:** Rate limiting enforced, analytics persisted

**Steps:**
1. Set environment variables (see Quick Start)
2. Deploy application (no code changes needed)
3. Verify health endpoint shows Redis healthy
4. Test rate limiting with curl/Postman
5. Check analytics after 1 hour of traffic

**Rollback:**  
Remove environment variables, restart application. Rate limiting returns to fail-open, analytics disabled.

---

## API Reference

### Rate Limiter

```typescript
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';

// Check rate limit
const result: RateLimitResult = await checkRateLimit(
  key: string,              // User ID, org ID, IP, etc.
  config: RateLimitConfig   // { limit, window, identifier }
);

// Result type
interface RateLimitResult {
  allowed: boolean;         // Whether request is allowed
  current: number;          // Current request count
  limit: number;            // Maximum requests allowed
  remaining: number;        // Requests remaining
  resetIn: number;          // Seconds until window resets
}
```

### Analytics Performance

```typescript
import { 
  performanceMonitor,
  withPerformanceTracking,
  getPerformanceMetrics
} from '@/lib/analytics-performance';

// Record query
await performanceMonitor.recordQuery(
  endpoint: string,
  duration: number,
  cached: boolean,
  tenantId: string
): Promise<void>

// Get endpoint report
await performanceMonitor.getEndpointReport(
  endpoint: string,
  dateKey?: string        // Optional: 'YYYY-MM-DD'
): Promise<PerformanceReport | null>

// Get all reports
await performanceMonitor.getAllReports(
  dateKey?: string
): Promise<PerformanceReport[]>

// Get slow queries
await performanceMonitor.getSlowQueries(
  limit?: number,
  dateKey?: string
): Promise<QueryMetric[]>

// Get tenant metrics
await performanceMonitor.getTenantMetrics(
  tenantId: string,
  dateKey?: string
): Promise<QueryMetric[]>

// Get summary
await performanceMonitor.getSummary(
  dateKey?: string
): Promise<PerformanceSummary | null>

// Export all metrics
await performanceMonitor.exportMetrics(
  dateKey?: string
): Promise<object>
```

---

## Support Resources

- **Upstash Documentation:** [docs.upstash.com](https://docs.upstash.com)
- **Upstash Support:** support@upstash.com
- **Redis Commands:** [redis.io/commands](https://redis.io/commands)
- **UnionEyes Health Check:** `/api/health`

---

**Last Updated:** February 6, 2026  
**Redis Version:** Upstash (Redis 7.x compatible)  
**Implementation Files:**
- `lib/rate-limiter.ts`
- `lib/analytics-performance.ts`
- `app/api/health/route.ts`
