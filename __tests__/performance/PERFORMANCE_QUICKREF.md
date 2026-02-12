# Performance Testing Quick Reference

Quick commands and common scenarios for performance testing.

## Quick Commands

### Run All Performance Tests
```bash
pnpm test __tests__/performance/
```

### Run Individual Test Suites
```bash
# GraphQL API
pnpm test __tests__/performance/graphql-api-performance.test.ts

# Database queries
pnpm test __tests__/performance/database-performance.test.ts

# Pension calculations
pnpm test __tests__/performance/pension-processor-performance.test.ts

# Insurance adapters
pnpm test __tests__/performance/insurance-adapter-performance.test.ts

# Concurrent operations
pnpm test __tests__/performance/concurrent-operations-performance.test.ts
```

### Run with Verbosity
```bash
pnpm vitest run __tests__/performance/ --reporter=verbose
```

## Common Performance Scenarios

### Testing API Response Time
```typescript
import { measurePerformance, warmup } from './performance-utils';

const queryFn = async () => {
  return resolvers.Query.pensionProcessors();
};

await warmup(queryFn);
const metrics = await measurePerformance(queryFn, 100);

console.log(`Average: ${metrics.avgTime.toFixed(2)}ms`);
console.log(`P95: ${metrics.p95.toFixed(2)}ms`);
console.log(`Throughput: ${metrics.throughput.toFixed(2)} req/sec`);
```

### Testing Database Query Performance
```typescript
import { db } from '@/db/database';
import { members } from '@/db/schema';
import { eq } from 'drizzle-orm';

const queryFn = async () => {
  return db.select().from(members).where(eq(members.id, 'test-id'));
};

const metrics = await measurePerformance(queryFn, 50);
```

### Testing Concurrent Load
```typescript
import { measureConcurrentPerformance } from './performance-utils';

const calcFn = async () => {
  return processor.calculateContribution({
    grossEarnings: 5000,
    paymentFrequency: PaymentFrequency.MONTHLY,
    year: 2026,
  });
};

// 50 simultaneous requests
const metrics = await measureConcurrentPerformance(calcFn, 50);
```

### Testing with Rate Limiting
```typescript
import { measureBatchedPerformance } from './performance-utils';

// 500 total requests, batches of 50
const metrics = await measureBatchedPerformance(apiCall, 500, 50);
```

### Validating Against Thresholds
```typescript
import { validateThresholds } from './performance-utils';

const thresholds = {
  avgTime: 100,      // 100ms average
  p95: 200,          // 200ms for P95
  minThroughput: 50, // 50 req/sec minimum
};

const validation = validateThresholds(metrics, thresholds);

if (!validation.passed) {
  console.error('Threshold failures:', validation.failures);
}

expect(validation.passed).toBe(true);
```

### Checking Memory Leaks
```typescript
const metrics = await measurePerformance(fn, 1000);

// Should not use excessive memory
expect(metrics.memoryUsedMB).toBeLessThan(50);
```

## Performance Expectations

### GraphQL API
| Operation | Average | P95 | P99 | Throughput |
|-----------|---------|-----|-----|------------|
| Simple query | 1-5ms | <20ms | <50ms | >1000 req/sec |
| Complex query | 10-20ms | <50ms | <100ms | >200 req/sec |
| Mutation | 15-30ms | <75ms | <150ms | >100 req/sec |
| Concurrent (50) | <50ms | <100ms | <200ms | - |

### Database Operations
| Operation | Average | P95 | P99 |
|-----------|---------|-----|-----|
| By ID | <50ms | <100ms | <150ms |
| Complex join | <100ms | <200ms | <400ms |
| Aggregation | <150ms | <300ms | <600ms |
| Concurrent (25) | <200ms | <400ms | <800ms |

### Pension Calculations
| Operation | Average | P95 | P99 | Throughput |
|-----------|---------|-----|-----|------------|
| CPP | 3-5ms | <10ms | <15ms | >500/sec |
| QPP | 3-5ms | <10ms | <15ms | >500/sec |
| OTPP | 8-12ms | <20ms | <30ms | >300/sec |
| Rate lookup | <1ms | <2ms | <5ms | >5000/sec |

### Insurance Adapters
| Operation | Average | P95 | P99 |
|-----------|---------|-----|-----|
| Initialize | 50-100ms | <200ms | <300ms |
| Capabilities | <1ms | <2ms | <5ms |
| Health check | 200-500ms | <800ms | <1200ms |

## Interpreting Results

### Good Performance ✅
```
Average: 15.23ms
P95: 28.45ms
P99: 42.67ms
Throughput: 245.67 req/sec
Memory: 8.34MB
```
- Average under threshold
- Low variance (P99 not much higher than average)
- Healthy throughput
- Reasonable memory usage

### Performance Warning ⚠️
```
Average: 125.45ms
P95: 342.89ms
P99: 678.23ms
Throughput: 35.12 req/sec
Memory: 87.45MB
```
- Average approaching threshold
- High variance (P99 much higher than average)
- Lower throughput
- Higher memory usage

### Performance Issue ❌
```
Average: 456.78ms
P95: 1234.56ms
P99: 2345.67ms
Throughput: 8.45 req/sec
Memory: 234.56MB
```
- Average exceeds threshold
- Extremely high variance
- Very low throughput
- Excessive memory usage

## Troubleshooting

### Test Running Slowly
1. Check database connection
2. Verify no background processes
3. Ensure test isolation
4. Review query complexity

### High Variance in Results
1. Increase warmup iterations
2. Run on dedicated hardware
3. Check system resource availability
4. Review test data consistency

### Memory Leaks Detected
1. Check for unclosed connections
2. Verify event listener cleanup
3. Review object retention
4. Test smaller batches

### Failing Thresholds
1. Review recent code changes
2. Check database indexes
3. Verify caching is working
4. Consider threshold adjustments

## CI/CD Integration

### Add to package.json
```json
{
  "scripts": {
    "test:performance": "vitest run __tests__/performance/",
    "test:perf:graphql": "vitest run __tests__/performance/graphql-api-performance.test.ts",
    "test:perf:db": "vitest run __tests__/performance/database-performance.test.ts",
    "test:perf:pension": "vitest run __tests__/performance/pension-processor-performance.test.ts"
  }
}
```

### GitHub Actions
```yaml
- name: Performance Tests
  run: pnpm test:performance
  
- name: Check for Regressions
  run: |
    if [ $? -ne 0 ]; then
      echo "Performance tests failed"
      exit 1
    fi
```

## Monitoring Production Performance

Apply these concepts to production:

### 1. Response Time Monitoring
```typescript
const start = performance.now();
const result = await operation();
const duration = performance.now() - start;

if (duration > 200) {
  logger.warn(`Slow operation: ${duration}ms`);
}
```

### 2. Throughput Tracking
```typescript
let requestCount = 0;
setInterval(() => {
  logger.info(`Throughput: ${requestCount} req/min`);
  requestCount = 0;
}, 60000);
```

### 3. Memory Monitoring
```typescript
const memoryUsage = process.memoryUsage();
logger.info({
  heapUsed: memoryUsage.heapUsed / 1024 / 1024,
  heapTotal: memoryUsage.heapTotal / 1024 / 1024,
});
```

## Best Practices Checklist

- [ ] Always warmup before measuring
- [ ] Use appropriate iteration counts
- [ ] Set realistic thresholds
- [ ] Test concurrent scenarios
- [ ] Monitor memory usage
- [ ] Document expected performance
- [ ] Compare with baselines
- [ ] Test edge cases
- [ ] Include error scenarios
- [ ] Run in consistent environment

## Quick Test Template

```typescript
import { describe, test, expect } from 'vitest';
import { 
  measurePerformance, 
  warmup, 
  validateThresholds 
} from './performance-utils';

describe('My Feature Performance', () => {
  test('should perform operation within threshold', async () => {
    const operationFn = async () => {
      // Your operation here
    };

    await warmup(operationFn);
    const metrics = await measurePerformance(operationFn, 100);

    console.log('Performance Metrics:');
    console.log(`  Average: ${metrics.avgTime.toFixed(2)}ms`);
    console.log(`  P95: ${metrics.p95.toFixed(2)}ms`);
    console.log(`  Throughput: ${metrics.throughput.toFixed(2)} req/sec`);

    const thresholds = {
      avgTime: 100,
      p95: 200,
      minThroughput: 50,
    };

    const validation = validateThresholds(metrics, thresholds);
    expect(validation.passed).toBe(true);
  });
});
```

---

For detailed documentation, see [README.md](./README.md)
