# Multi-Layer Rate Limiting Guide

## Overview

Multi-layer rate limiting provides **defense-in-depth** protection by enforcing multiple rate limit checks on a single request. This approach combines per-user, per-IP, and per-endpoint rate limits to prevent abuse even when attackers use sophisticated techniques.

**Created:** January 2025  
**Status:** Production-Ready ✅  
**Priority:** P1 - High Priority Security Enhancement

---

## Table of Contents

- [Why Multi-Layer Rate Limiting?](#why-multi-layer-rate-limiting)
- [Architecture](#architecture)
- [Rate Limit Layers](#rate-limit-layers)
- [Usage Examples](#usage-examples)
- [Configuration](#configuration)
- [Best Practices](#best-practices)
- [Monitoring & Observability](#monitoring--observability)
- [Migration Guide](#migration-guide)

---

## Why Multi-Layer Rate Limiting?

### Problem: Single-Layer Rate Limiting Gaps

Traditional single-layer rate limiting has vulnerabilities:

1. **Compromised Account Attack**:
   - Attacker gains access to legitimate user account
   - Per-user rate limit allows 100 requests/hour
   - Attacker can abuse expensive operations (AI, payments)

2. **Multi-Account Attack**:
   - Attacker creates multiple accounts from single IP
   - Each account gets full per-user rate limit
   - 10 accounts × 100 req/hour = 1000 req/hour from one IP

3. **Distributed Attack**:
   - Attacker uses multiple IPs and accounts
   - Bypasses both per-user and per-IP limits

### Solution: Defense-in-Depth

Multi-layer rate limiting requires requests to pass **ALL** configured rate limit checks:

```typescript
// Request must pass BOTH user AND IP rate limits
Per-user limit:  20 requests/hour ✅
Per-IP limit:    50 requests/hour ✅
→ Request allowed

// If either limit exceeded, request rejected
Per-user limit:  20/20 (exceeded) ❌
Per-IP limit:    30/50 (OK) ✅
→ Request rejected (user limit exceeded)
```

**Benefits**:
- 🛡️ **Account compromise protection**: IP limit prevents abuse of stolen accounts
- 🛡️ **Multi-account protection**: Per-user limit prevents IP with many accounts
- 🛡️ **Cost control**: More robust protection for expensive operations (AI, payments)
- 🛡️ **DDoS mitigation**: Per-endpoint limits protect against distributed attacks

---

## Architecture

### Components

1. **`checkMultiLayerRateLimit()`** (lib/rate-limiter.ts)
   - Core function checking multiple rate limit layers
   - Returns detailed result with failed layer information
   - Atomically checks all layers using Redis pipeline

2. **`checkAndEnforceMultiLayerRateLimit()`** (lib/middleware/rate-limit-middleware.ts)
   - Convenience wrapper for API routes
   - Automatically extracts userId, IP, endpoint key
   - Returns 429 response with detailed error message

3. **Redis Sliding Window Algorithm**
   - Distributed rate limiting across server instances
   - Atomic operations prevent race conditions
   - Automatic cleanup of old entries

### Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                       Incoming Request                          │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │  Extract Identifiers    │
                    │  - userId                │
                    │  - IP address            │
                    │  - endpoint key          │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────────────────────────┐
                    │  checkMultiLayerRateLimit()                 │
                    │                                             │
                    │  ┌──────────────┐                           │
                    │  │ Per-User     │ ◄─── Redis (userId)       │
                    │  │ Rate Limit   │                           │
                    │  └──────┬───────┘                           │
                    │         │ allowed? YES                      │
                    │  ┌──────▼───────┐                           │
                    │  │ Per-IP       │ ◄─── Redis (IP)           │
                    │  │ Rate Limit   │                           │
                    │  └──────┬───────┘                           │
                    │         │ allowed? YES                      │
                    │  ┌──────▼───────┐                           │
                    │  │ Per-Endpoint │ ◄─── Redis (endpoint)     │
                    │  │ Rate Limit   │                           │
                    │  └──────┬───────┘                           │
                    │         │ allowed? YES                      │
                    └─────────┼─────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
          ┌───▼────┐                    ┌────▼─────┐
          │ 429    │                    │ 200 OK   │
          │ Reject │                    │ Allow    │
          │ + Layer│                    │ Request  │
          └────────┘                    └──────────┘
```

---

## Rate Limit Layers

### 1. Per-User Rate Limits (RATE_LIMITS)

**Purpose**: Limit requests per authenticated user

**Use cases**:
- Expensive operations (AI, ML, payments)
- Resource-intensive operations (exports, reports)
- Sensitive operations (voting, financial transactions)

**Example**:
```typescript
import { RATE_LIMITS } from '@/lib/rate-limiter';

// 20 AI queries per hour per user
RATE_LIMITS.AI_QUERY: {
  limit: 20,
  window: 3600, // 1 hour
  identifier: 'ai-query'
}
```

### 2. Per-IP Rate Limits (RATE_LIMITS_PER_IP)

**Purpose**: Limit requests per IP address (regardless of user)

**Use cases**:
- Prevent multi-account attacks from single IP
- Protect authentication endpoints
- Prevent distributed abuse

**Configuration**: More permissive than per-user (allows multiple legitimate users per IP)

**Example**:
```typescript
import { RATE_LIMITS_PER_IP } from '@/lib/rate-limiter';

// 50 AI queries per hour per IP (2.5x per-user limit)
RATE_LIMITS_PER_IP.AI_QUERY: {
  limit: 50,
  window: 3600, // 1 hour
  identifier: 'ai-query-per-ip'
}
```

### 3. Per-Endpoint Rate Limits (Optional)

**Purpose**: Global rate limit for entire endpoint (all users, all IPs)

**Use cases**:
- Protect against distributed attacks
- Enforce system-wide capacity limits
- Prevent total resource exhaustion

**Example**:
```typescript
// Global limit for financial operations: 1000/hour total
perEndpoint: {
  limit: 1000,
  window: 3600,
  identifier: 'financial-write-global'
}
```

---

## Usage Examples

### Example 1: Basic Multi-Layer Rate Limiting

```typescript
// app/api/ai/query/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { checkAndEnforceMultiLayerRateLimit } from '@/lib/middleware/rate-limit-middleware';
import { RATE_LIMITS, RATE_LIMITS_PER_IP } from '@/lib/rate-limiter';
import { auth } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  
  // Check multi-layer rate limits (per-user + per-IP)
  const rateLimitResponse = await checkAndEnforceMultiLayerRateLimit(
    request,
    {
      perUser: RATE_LIMITS.AI_QUERY,      // 20/hour per user
      perIP: RATE_LIMITS_PER_IP.AI_QUERY, // 50/hour per IP
    },
    { userId: userId || undefined }
  );

  // If rate limited, return 429 response
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  // Continue with AI query logic...
  const result = await processAIQuery(request);
  return NextResponse.json(result);
}
```

### Example 2: Financial Operations (Maximum Security)

```typescript
// app/api/stripe/payment/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { checkAndEnforceMultiLayerRateLimit } from '@/lib/middleware/rate-limit-middleware';
import { RATE_LIMITS, RATE_LIMITS_PER_IP } from '@/lib/rate-limiter';
import { auth } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  const { userId, orgId } = await auth();
  
  // Maximum security: per-user + per-IP + per-endpoint
  const rateLimitResponse = await checkAndEnforceMultiLayerRateLimit(
    request,
    {
      perUser: RATE_LIMITS.FINANCIAL_WRITE,      // 20/hour per user
      perIP: RATE_LIMITS_PER_IP.FINANCIAL_WRITE, // 50/hour per IP
      perEndpoint: {                             // 500/hour total
        limit: 500,
        window: 3600,
        identifier: 'financial-write-global',
      },
    },
    { userId: userId || undefined }
  );

  if (rateLimitResponse) {
    // Log security event for financial endpoint
    logger.warn('Financial operation rate limited', {
      userId,
      orgId,
      ip: request.headers.get('x-forwarded-for'),
      path: request.nextUrl.pathname,
    });
    return rateLimitResponse;
  }

  // Process payment...
  const result = await processPayment(request);
  return NextResponse.json(result);
}
```

### Example 3: Authentication Endpoints (IP-Only)

```typescript
// app/api/auth/signin/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { checkAndEnforceMultiLayerRateLimit } from '@/lib/middleware/rate-limit-middleware';
import { RATE_LIMITS_PER_IP } from '@/lib/rate-limiter';

export async function POST(request: NextRequest) {
  // Authentication endpoints: Only per-IP rate limit
  // (no userId available yet)
  const rateLimitResponse = await checkAndEnforceMultiLayerRateLimit(
    request,
    {
      perIP: RATE_LIMITS_PER_IP.AUTH, // 10 attempts per 15 min per IP
    }
  );

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  // Process sign-in...
  const result = await signIn(request);
  return NextResponse.json(result);
}
```

### Example 4: Document Upload (Moderate Security)

```typescript
// app/api/documents/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { checkAndEnforceMultiLayerRateLimit } from '@/lib/middleware/rate-limit-middleware';
import { RATE_LIMITS, RATE_LIMITS_PER_IP } from '@/lib/rate-limiter';
import { auth } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  
  // Moderate security: per-user + per-IP
  const rateLimitResponse = await checkAndEnforceMultiLayerRateLimit(
    request,
    {
      perUser: RATE_LIMITS.DOCUMENT_UPLOAD,      // 30/hour per user
      perIP: RATE_LIMITS_PER_IP.DOCUMENT_UPLOAD, // 100/hour per IP
    },
    { userId: userId || undefined }
  );

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  // Process upload...
  const result = await uploadDocument(request);
  return NextResponse.json(result);
}
```

---

## Configuration

### Available Per-User Rate Limits (RATE_LIMITS)

| Operation | Limit | Window | Identifier |
|-----------|-------|--------|------------|
| AI Query | 20 | 1 hour | `ai-query` |
| AI Completion | 20 | 1 hour | `ai-completion` |
| ML Training | 5 | 1 hour | `ml-training` |
| Financial Write | 20 | 1 hour | `financial-write` |
| Document Upload | 30 | 1 hour | `document-upload` |
| Exports | 50 | 1 hour | `exports` |
| General API | 1000 | 1 hour | `general-api` |

**Full list**: See [lib/rate-limiter.ts](../../lib/rate-limiter.ts)

### Available Per-IP Rate Limits (RATE_LIMITS_PER_IP)

| Operation | Limit | Window | Identifier |
|-----------|-------|--------|------------|
| Authentication | 10 | 15 min | `auth-per-ip` |
| Sign-up | 5 | 1 hour | `signup-per-ip` |
| Password Reset | 5 | 1 hour | `password-reset-per-ip` |
| Financial Write | 50 | 1 hour | `financial-write-per-ip` |
| AI Query | 50 | 1 hour | `ai-query-per-ip` |
| Document Upload | 100 | 1 hour | `document-upload-per-ip` |
| Exports | 100 | 1 hour | `exports-per-ip` |
| General API | 2000 | 1 hour | `general-api-per-ip` |

### Custom Rate Limit Configuration

```typescript
// Custom multi-layer configuration
const customConfig: MultiLayerRateLimitConfig = {
  perUser: {
    limit: 10,
    window: 3600, // 1 hour
    identifier: 'custom-operation',
  },
  perIP: {
    limit: 30,
    window: 3600, // 1 hour
    identifier: 'custom-operation-per-ip',
  },
  perEndpoint: {
    limit: 100,
    window: 3600, // 1 hour
    identifier: 'custom-operation-global',
  },
};
```

---

## Best Practices

### 1. **Choose Appropriate Layers**

| Endpoint Type | Recommended Layers | Rationale |
|---------------|-------------------|-----------|
| Authentication | Per-IP only | No userId available yet |
| Public API (unauthenticated) | Per-IP only | No userId available |
| Expensive operations (AI, ML) | Per-user + Per-IP | High cost, needs defense-in-depth |
| Financial operations | Per-user + Per-IP + Per-endpoint | Maximum security |
| Document uploads | Per-user + Per-IP | Prevent storage abuse |
| General API (authenticated) | Per-user only | Basic protection sufficient |

### 2. **Set Per-IP Limits Higher Than Per-User**

**Reason**: Multiple legitimate users may share an IP address (corporate NAT, public WiFi)

**Recommended ratio**: Per-IP limit = 2-5× per-user limit

```typescript
// ✅ GOOD: Per-IP limit 2.5x higher than per-user
perUser: { limit: 20, window: 3600 },  // 20/hour per user
perIP: { limit: 50, window: 3600 },    // 50/hour per IP

// ❌ BAD: Per-IP limit lower than per-user
perUser: { limit: 20, window: 3600 },  // 20/hour per user
perIP: { limit: 10, window: 3600 },    // 10/hour per IP (blocks legitimate users!)
```

### 3. **Use Per-Endpoint Limits Sparingly**

**When to use**:
- System has hard capacity limits (DB connections, external API quotas)
- Distributed attack using many IPs and accounts
- Critical infrastructure protection

**When NOT to use**:
- Normal API endpoints (too restrictive)
- High-traffic read operations (may block legitimate traffic)

### 4. **Monitor Failed Layer Patterns**

```typescript
// Log which layer failed for security analysis
logger.warn('Multi-layer rate limit exceeded', {
  failedLayer: result.failedLayer, // 'user', 'ip', or 'endpoint'
  userId,
  ipAddress,
  path: request.nextUrl.pathname,
});
```

**Analysis**:
- **Frequent 'user' failures**: Legitimate high-usage user OR compromised account
- **Frequent 'ip' failures**: Multi-account attack from single IP
- **Frequent 'endpoint' failures**: Distributed attack OR capacity issue

### 5. **Return Helpful Error Messages**

```typescript
// ✅ GOOD: Specify which limit exceeded
{
  error: 'Rate limit exceeded',
  message: 'Rate limit exceeded (per-IP). Maximum 50 requests allowed. Please try again in 45 minutes.',
  failedLayer: 'ip',
  resetIn: 2700 // seconds
}

// ❌ BAD: Generic error message
{
  error: 'Too many requests'
}
```

---

## Monitoring & Observability

### Logging

All multi-layer rate limit violations are logged with structured data:

```typescript
logger.warn('Multi-layer rate limit exceeded', {
  failedLayer: 'ip',
  userId: 'user-123',
  ipAddress: '192.168.1.1',
  limit: 50,
  remaining: 0,
  resetIn: 2700,
  path: '/api/ai/query',
  method: 'POST',
  layers: {
    user: { allowed: true, remaining: 15 },
    ip: { allowed: false, remaining: 0 },
  },
});
```

### Metrics to Track

1. **Rate limit violations by layer**:
   - Per-user failures (potential abuse)
   - Per-IP failures (potential attack)
   - Per-endpoint failures (capacity issue)

2. **Rate limit headroom**:
   - Average remaining requests per user
   - Average remaining requests per IP
   - Time to reset

3. **Attack patterns**:
   - Same IP hitting multiple user limits
   - Multiple IPs hitting same user limit (credential stuffing)
   - Distributed endpoint limit violations

### Grafana Dashboard Queries

```promql
# Rate limit violations by layer (last 1 hour)
sum by (failedLayer) (
  rate(rate_limit_exceeded_total{layer!=""}[1h])
)

# Top IPs by rate limit violations
topk(10,
  sum by (ipAddress) (
    rate(rate_limit_exceeded_total{failedLayer="ip"}[1h])
  )
)

# Rate limit headroom (average remaining)
avg by (identifier) (
  rate_limit_remaining
)
```

---

## Migration Guide

### Migrating Existing Endpoints

**Step 1**: Identify high-risk endpoints

```bash
# Endpoints requiring multi-layer rate limiting:
# - Financial operations (/api/stripe/*, /api/dues/*)
# - AI operations (/api/ai/*, /api/llm/*)
# - Authentication (/api/auth/*)
# - Document uploads (/api/documents/upload)
# - Exports (/api/*/export)
```

**Step 2**: Replace single-layer rate limiting

```typescript
// BEFORE: Single-layer rate limiting
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';

const result = await checkRateLimit(userId, RATE_LIMITS.AI_QUERY);
if (!result.allowed) {
  return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
}

// AFTER: Multi-layer rate limiting
import { checkAndEnforceMultiLayerRateLimit } from '@/lib/middleware/rate-limit-middleware';
import { RATE_LIMITS, RATE_LIMITS_PER_IP } from '@/lib/rate-limiter';

const rateLimitResponse = await checkAndEnforceMultiLayerRateLimit(
  request,
  {
    perUser: RATE_LIMITS.AI_QUERY,
    perIP: RATE_LIMITS_PER_IP.AI_QUERY,
  },
  { userId }
);

if (rateLimitResponse) {
  return rateLimitResponse;
}
```

**Step 3**: Update tests

```typescript
// Test multi-layer rate limiting
it('should enforce per-user rate limit', async () => {
  // Make 21 requests (exceeds 20/hour user limit)
  for (let i = 0; i < 21; i++) {
    const response = await POST(mockRequest);
    if (i === 20) {
      expect(response.status).toBe(429);
      const data = await response.json();
      expect(data.failedLayer).toBe('user');
    }
  }
});

it('should enforce per-IP rate limit', async () => {
  // Make 51 requests from same IP with different users (exceeds 50/hour IP limit)
  for (let i = 0; i < 51; i++) {
    const response = await POST(mockRequestWithUserId(`user-${i}`));
    if (i === 50) {
      expect(response.status).toBe(429);
      const data = await response.json();
      expect(data.failedLayer).toBe('ip');
    }
  }
});
```

**Step 4**: Deploy and monitor

```bash
# Monitor rate limit violations
pnpm logs:search "Multi-layer rate limit exceeded"

# Check Redis keys
redis-cli KEYS "ratelimit:*-per-ip:*"
redis-cli KEYS "ratelimit:ai-query:*"
```

### Rollback Plan

If multi-layer rate limiting causes issues:

1. **Immediate rollback**: Change `checkAndEnforceMultiLayerRateLimit()` to `checkAndEnforceRateLimit()`
2. **Temporary increase limits**: Increase per-IP limits by 2-3×
3. **Disable layers**: Remove `perIP` or `perEndpoint` configuration

```typescript
// Rollback: Disable per-IP rate limiting
const rateLimitResponse = await checkAndEnforceMultiLayerRateLimit(
  request,
  {
    perUser: RATE_LIMITS.AI_QUERY,
    // perIP: RATE_LIMITS_PER_IP.AI_QUERY, // DISABLED
  },
  { userId }
);
```

---

## FAQ

### Q: Will multi-layer rate limiting block legitimate users?

**A**: Unlikely, if per-IP limits are configured correctly (2-5× per-user limits).

**Example**:
- Office with 10 employees sharing 1 IP
- Per-user limit: 20/hour
- Per-IP limit: 50/hour
- Maximum legitimate traffic: 10 users × 20 req/hour = 200 req/hour
- **Issue**: Per-IP limit (50) may be too low!

**Solution**: Either:
1. Increase per-IP limit to 200+
2. Only use per-IP for critical endpoints

### Q: What happens if Redis is unavailable?

**A**: Rate limiter **fails closed** (rejects all requests) to prevent abuse.

```typescript
// Redis unavailable
logger.error('Redis not configured for rate limiting - rejecting request');
return {
  allowed: false,
  error: 'Rate limiting service unavailable',
};
```

**Production recommendation**: Always configure Redis with high availability.

### Q: How do I test multi-layer rate limiting locally?

```typescript
// Use Upstash Redis (free tier)
// .env.local
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token

// Or use Redis Docker container
docker run -d -p 6379:6379 redis:7-alpine
```

### Q: Can I customize which layer failed in error message?

**A**: Yes, the response includes `failedLayer` field:

```typescript
const response = await checkAndEnforceMultiLayerRateLimit(...);
if (response) {
  const data = await response.json();
  
  // Customize error message based on failed layer
  if (data.failedLayer === 'ip') {
    console.log('Multiple accounts from your IP detected');
  } else if (data.failedLayer === 'user') {
    console.log('Your account limit exceeded');
  }
}
```

---

## Related Documentation

- [Rate Limiting Complete (Option 3)](./OPTION_3_RATE_LIMITING_COMPLETE.md)
- [Redis Usage Guide](../user-guides/REDIS_USAGE_GUIDE.md)
- [Production Environment Audit](../PRODUCTION_ENVIRONMENT_AUDIT.md)
- [OpenTelemetry Quick Start](../OPENTELEMETRY_QUICK_START.md)

---

## Support & Troubleshooting

### Common Issues

**Issue 1: "Rate limit exceeded (per-IP)" but only 1 user**

**Cause**: Shared IP address (NAT, VPN, public WiFi)

**Solution**: Increase per-IP limits or whitelist known shared IPs

---

**Issue 2: All requests failing with "Rate limiting service unavailable"**

**Cause**: Redis connection failure

**Solution**:
```bash
# Check Redis health
curl -X GET https://your-app.com/api/health

# Verify Redis environment variables
echo $UPSTASH_REDIS_REST_URL
echo $UPSTASH_REDIS_REST_TOKEN

# Test Redis connection
redis-cli PING
```

---

**Issue 3: High latency on rate-limited endpoints**

**Cause**: Multiple sequential Redis calls

**Solution**: Use multi-layer rate limiting (batches Redis calls):
```typescript
// ✅ GOOD: Single multi-layer check (3 Redis calls in pipeline)
checkMultiLayerRateLimit({ userId, ipAddress }, config);

// ❌ BAD: Multiple sequential checks (6 Redis calls)
await checkRateLimit(userId, RATE_LIMITS.AI_QUERY);
await checkRateLimit(ipAddress, RATE_LIMITS_PER_IP.AI_QUERY);
```

---

**Last Updated:** January 2025  
**Version:** 1.0.0  
**Status:** Production-Ready ✅
