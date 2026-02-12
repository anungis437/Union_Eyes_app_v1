# 🚀 A+ Implementation Quick Reference
**Union Eyes Application - Developer Guide**

---

## 🎯 Quick Navigation

| Feature | File | Status |
|---------|------|--------|
| Standardized Errors | [`lib/api/standardized-responses.ts`](lib/api/standardized-responses.ts) | ✅ Ready |
| Circuit Breaker | [`lib/circuit-breaker.ts`](lib/circuit-breaker.ts) | ✅ Ready |
| Date Utils | [`lib/date-utils.ts`](lib/date-utils.ts) | ✅ Ready |
| API Client | [`lib/api-client.ts`](lib/api-client.ts) | ✅ Ready |
| Rate Limiter | [`lib/rate-limiter.ts`](lib/rate-limiter.ts) | ✅ Enhanced |
| Logger | [`lib/logger.ts`](lib/logger.ts) | ✅ Enhanced |
| Health Check | [`app/api/health/route.ts`](app/api/health/route.ts) | ✅ Enhanced |

---

## 📋 Common Tasks

### 1. Return Standardized Error

```typescript
import { standardErrorResponse, ErrorCode } from '@/lib/api/standardized-responses';

// Validation error
return standardErrorResponse(
  ErrorCode.VALIDATION_ERROR,
  'Email address is invalid',
  { field: 'email', provided: body.email }
);

// Not found
return standardErrorResponse(
  ErrorCode.NOT_FOUND,
  'User not found'
);

// Rate limit exceeded
return standardErrorResponse(
  ErrorCode.RATE_LIMIT_EXCEEDED,
  'Too many requests',
  { resetIn: 3600 }
);
```

### 2. Handle Dates Correctly

```typescript
import { toUTCISO, formatForDisplay, formatAsDate } from '@/lib/date-utils';

// Storage (always UTC ISO)
const createdAt = toUTCISO(new Date());
await db.insert(table).values({ createdAt });

// Display to user (timezone-aware)
const display = formatForDisplay(row.createdAt, userTimezone);
// → "Feb 11, 2026, 10:30 AM"

// Date-only format
const dateOnly = formatAsDate(row.createdAt);
// → "2026-02-11"
```

### 3. Call External API

```typescript
import { createExternalApiClient } from '@/lib/api-client';

const client = createExternalApiClient(
  'partner-api',
  'https://api.partner.com',
  { 'X-API-Key': process.env.PARTNER_API_KEY }
);

try {
  const response = await client.get('/data');
  return response.data;
} catch (error) {
  // Circuit breaker handles failures automatically
  return fallbackValue;
}
```

### 4. Use Circuit Breaker Directly

```typescript
import { circuitBreakers, CIRCUIT_BREAKERS } from '@/lib/circuit-breaker';

const breaker = circuitBreakers.get('my-service', CIRCUIT_BREAKERS.EXTERNAL_API);

const result = await breaker.executeWithFallback(
  async () => {
    // Your risky operation
    return await externalService.call();
  },
  defaultValue // Fallback when circuit open
);
```

### 5. Check Rate Limit

```typescript
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';

const result = await checkRateLimit(userId, RATE_LIMITS.AI_QUERY);

if (!result.allowed) {
  return standardErrorResponse(
    ErrorCode.RATE_LIMIT_EXCEEDED,
    'Rate limit exceeded',
    { resetIn: result.resetIn, limit: result.limit }
  );
}
```

### 6. Log Safely

```typescript
import { logger } from '@/lib/logger';

// Never log raw Error objects in production
// ❌ BAD
logger.error('Failed', error);

// ✅ GOOD
logger.error('Operation failed', error, {
  userId,
  operation: 'create-claim',
  // Context is sanitized automatically
});
```

---

## 🔍 Debugging

### Check Circuit Breaker Status

```bash
# Health endpoint shows all circuit breakers
curl https://app.unioneyes.com/api/health | jq '.checks[] | select(.name == "circuit_breakers")'
```

### Find Trace ID in Logs

```typescript
// Every error has a traceId for correlation
{
  "code": "INTERNAL_ERROR",
  "message": "Something went wrong",
  "traceId": "abc123-def456",  // <-- Search logs with this
  "timestamp": "2026-02-11T15:30:00.000Z"
}
```

### Monitor Rate Limiting

```typescript
// Rate limit headers in response
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 47
X-RateLimit-Reset: 3456
```

---

## 🚨 Common Errors

### Error: Circuit Breaker Open

```
CircuitBreakerOpenError: Circuit breaker 'redis-rate-limiter' is OPEN
```

**Cause**: Service has failed multiple times, circuit is protecting against cascade failure

**Solution**: 
1. Check health endpoint: `GET /api/health`
2. Wait for circuit to test recovery (timeout period)
3. If persistent, investigate underlying service
4. Manual reset (admin): `breaker.reset()`

### Error: Rate Limiting Service Unavailable

```json
{
  "code": "SERVICE_UNAVAILABLE",
  "message": "Rate limiting service temporarily unavailable"
}
```

**Cause**: Redis is down or circuit breaker is open

**Solution**:
1. Check Redis connectivity
2. Check circuit breaker state: `GET /api/health`
3. Wait for circuit to recover
4. Verify Redis credentials

### Error: Invalid Date Format

```
Error: Invalid date: xyz
```

**Solution**: Use `toUTCISO()` for all date storage
```typescript
// ❌ BAD
const date = new Date().toString();

// ✅ GOOD
const date = toUTCISO(new Date());
```

---

## 🧪 Testing

### Test Circuit Breaker

```typescript
import { circuitBreakers, CIRCUIT_BREAKERS } from '@/lib/circuit-breaker';

const breaker = circuitBreakers.get('test', {
  threshold: 2,      // Open after 2 failures
  timeout: 1000,     // Test recovery after 1s
  successThreshold: 1
});

// Simulate failures
for (let i = 0; i < 3; i++) {
  try {
    await breaker.execute(async () => {
      throw new Error('Simulated failure');
    });
  } catch (error) {
    console.log('Failure', i + 1);
  }
}

// Check state
console.log(breaker.getState()); // 'OPEN'
console.log(breaker.getStats());
```

### Test Error Responses

```typescript
import { standardErrorResponse, ErrorCode } from '@/lib/api/standardized-responses';

const response = standardErrorResponse(
  ErrorCode.VALIDATION_ERROR,
  'Test error',
  { field: 'test' }
);

const body = await response.json();
console.log(body);
// {
//   code: 'VALIDATION_ERROR',
//   message: 'Test error',
//   details: { field: 'test' },
//   traceId: '...',
//   timestamp: '...'
// }
```

---

## 📊 Monitoring

### Prometheus Metrics (Planned)

```
# Circuit breaker state
circuit_breaker_state{name="redis"} 0  # 0=closed, 1=open, 2=half_open

# Circuit breaker requests
circuit_breaker_requests_total{name="redis",status="success"} 15234
circuit_breaker_requests_total{name="redis",status="failure"} 12

# Rate limiting
rate_limit_requests_total{identifier="ai-query",status="allowed"} 9876
rate_limit_requests_total{identifier="ai-query",status="blocked"} 123
```

### Health Check

```bash
# Full health status
curl https://app.unioneyes.com/api/health | jq

# Just circuit breakers
curl https://app.unioneyes.com/api/health | jq '.checks[] | select(.name == "circuit_breakers")'

# Overall status
curl -s https://app.unioneyes.com/api/health | jq -r '.status'
```

---

## 🎓 Best Practices

### ✅ DO

- Use `standardErrorResponse()` for all errors
- Use `toUTCISO()` for all date storage
- Use circuit breakers for external services
- Log with context, not raw errors
- Check rate limits before expensive operations
- Return trace IDs in error responses

### ❌ DON'T

- Return inconsistent error formats
- Log raw Error objects in production
- Store dates in non-UTC formats
- Call external APIs without circuit breakers
- Ignore rate limit results
- Leak stack traces in production

---

## 🔗 Related Documentation

- [Full Implementation Report](A+_ACHIEVEMENT_IMPLEMENTATION_REPORT.md)
- [Security Audit](COMPREHENSIVE_SECURITY_AUDIT_RESPONSE.md)
- [Rate Limiting Guide](lib/rate-limiter.ts)
- [Logger Documentation](lib/logger.ts)

---

**Last Updated**: February 11, 2026
**Version**: 1.0
