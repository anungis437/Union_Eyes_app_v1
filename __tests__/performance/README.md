# Performance Testing Suite

Comprehensive performance benchmarking and load testing for the Union Eyes application.

## Overview

This performance testing suite measures and validates the performance characteristics of critical application components under various load conditions. It helps identify bottlenecks, validates performance requirements, and ensures the application scales effectively.

## Test Coverage

### 1. GraphQL API Performance (`graphql-api-performance.test.ts`)

Tests GraphQL query and mutation performance:
- **Pension Processor Queries**: List processors, get specific processor, retrieve contribution rates
- **Contribution Calculations**: CPP, QPP, and OTPP pension calculations
- **Concurrent Requests**: 30-50 concurrent GraphQL operations
- **Schema Resolution**: Type validation and query/mutation presence
- **Memory Usage**: Memory leak detection over 500-1000 operations
- **Error Handling**: Invalid query performance

**Performance Thresholds:**
- Average query time: <10ms
- P95 response time: <20ms
- Throughput: >1000 req/sec for simple queries
- Memory usage: <50MB for 1000 queries

### 2. Database Query Performance (`database-performance.test.ts`)

Tests database operation performance:
- **Simple SELECT Queries**: Single record lookups by ID
- **Complex JOIN Queries**: Multi-table joins with filtering
- **Range Queries**: Date and amount range filtering
- **Aggregation Queries**: COUNT, SUM, GROUP BY operations
- **Concurrent Queries**: 20-50 simultaneous database operations
- **Pagination**: Offset-based and cursor-based pagination
- **Index Effectiveness**: Comparison of indexed vs non-indexed queries

**Performance Thresholds:**
- Simple query: <50ms average
- Complex join: <100ms average
- P95: <200ms
- Concurrent queries: <400ms P95

### 3. Pension Processor Performance (`pension-processor-performance.test.ts`)

Tests pension calculation engine performance:
- **CPP Calculations**: Contribution calculations with various payment frequencies
- **QPP Calculations**: Quebec Pension Plan calculations
- **OTPP Calculations**: Tiered rate calculations with years of service
- **Rate Lookups**: Contribution rate retrieval (cached)
- **Concurrent Calculations**: 60-100 simultaneous calculations
- **Batch Processing**: 300-500 calculations in batches
- **Edge Cases**: Minimum and maximum earnings

**Performance Thresholds:**
- CPP/QPP calculation: <5ms average
- OTPP calculation: <10ms average
- Rate lookup: <1ms (cached)
- Throughput: >500 calculations/sec
- Concurrent (100): <100ms P95

### 4. Insurance Adapter Performance (`insurance-adapter-performance.test.ts`)

Tests insurance integration adapter performance:
- **Adapter Initialization**: Setup time for Green Shield, Canada Life, Industrial Alliance
- **Capabilities Check**: Metadata retrieval performance
- **Health Checks**: Connection validation performance
- **Rate Limiting**: Validation of rate limit configurations
- **Concurrent Initializations**: 10 simultaneous adapter setups
- **Memory Efficiency**: Memory leak detection over 100 initializations
- **Error Handling**: Invalid configuration handling

**Performance Thresholds:**
- Initialization: <100ms average
- Capabilities check: <0.5ms (instant)
- Health check: <500ms
- Memory: <50MB for 100 initializations

### 5. Concurrent Operations Performance (`concurrent-operations-performance.test.ts`)

Tests system behavior under high concurrency:
- **High Concurrency**: 50-200 concurrent operations
- **Mixed Workloads**: GraphQL queries, database operations, calculations
- **Burst Patterns**: Simulation of traffic spikes
- **Batched Processing**: 200-500 operations in controlled batches
- **Resource Contention**: Multiple requests for shared resources
- **Scaling Characteristics**: Performance at 10, 25, 50, 100 concurrent operations
- **Peak Load**: 200 concurrent mixed operations

**Performance Thresholds:**
- 100 concurrent queries: <200ms P95
- Mixed workload: <300ms average
- Peak load (200): <500ms average, <1000ms P99
- Memory under load: <100MB

## Performance Utilities

### `performance-utils.ts`

Shared utilities for all performance tests:

#### Types
```typescript
interface PerformanceMetrics {
  executions: number;
  totalTime: number;
  avgTime: number;
  minTime: number;
  maxTime: number;
  p50: number; // Median
  p95: number; // 95th percentile
  p99: number; // 99th percentile
  throughput: number; // req/sec
  memoryUsedMB?: number;
  opsPerSecond?: number;
}

interface PerformanceThresholds {
  avgTime?: number;
  p95?: number;
  p99?: number;
  minThroughput?: number;
  maxMemoryMB?: number;
}
```

#### Key Functions

**`measurePerformance(fn, iterations)`**
- Executes function multiple times sequentially
- Collects timing and memory metrics
- Returns comprehensive performance data

**`measureConcurrentPerformance(fn, concurrency)`**
- Executes function N times in parallel
- Measures concurrent load handling
- Useful for stress testing

**`measureBatchedPerformance(fn, totalRequests, batchSize)`**
- Executes requests in controlled batches
- Simulates rate-limited scenarios
- Prevents resource exhaustion

**`validateThresholds(metrics, thresholds)`**
- Compares metrics against defined thresholds
- Returns pass/fail status with failure details
- Useful for CI/CD integration

**`warmup(fn, iterations)`**
- Executes function multiple times before measurement
- Eliminates cold start effects
- Ensures JIT compilation

**`compareMetrics(baseline, current)`**
- Compares two performance metrics
- Calculates percentage changes
- Identifies regressions

## Running Performance Tests

### Run All Performance Tests
```bash
pnpm test __tests__/performance/
```

### Run Specific Test Suite
```bash
# GraphQL API performance
pnpm test __tests__/performance/graphql-api-performance.test.ts

# Database performance
pnpm test __tests__/performance/database-performance.test.ts

# Pension processor performance
pnpm test __tests__/performance/pension-processor-performance.test.ts

# Insurance adapter performance
pnpm test __tests__/performance/insurance-adapter-performance.test.ts

# Concurrent operations performance
pnpm test __tests__/performance/concurrent-operations-performance.test.ts
```

### Run with Verbose Output
```bash
pnpm vitest run __tests__/performance/ --reporter=verbose
```

## Performance Metrics Interpretation

### Response Time Metrics

- **Average Time**: Mean response time across all requests
  - Good: <50ms for queries, <100ms for complex operations
  - Acceptable: <200ms
  - Poor: >500ms

- **P95 (95th Percentile)**: 95% of requests completed within this time
  - Good: <100ms
  - Acceptable: <300ms
  - Poor: >1000ms

- **P99 (99th Percentile)**: 99% of requests completed within this time
  - Good: <200ms
  - Acceptable: <500ms
  - Poor: >2000ms

### Throughput Metrics

- **Requests per Second**: Number of operations completed per second
  - High throughput: >1000 req/sec (simple queries)
  - Medium throughput: 100-1000 req/sec (calculations)
  - Low throughput: <100 req/sec (complex operations)

### Memory Metrics

- **Memory Used**: Heap memory consumed during test
  - Efficient: <10MB per 100 operations
  - Acceptable: <50MB per 100 operations
  - Memory leak concern: >100MB per 100 operations

## Performance Baselines

### GraphQL Operations
- Simple queries: 1-5ms average
- Complex queries: 10-20ms average
- Mutations: 15-30ms average
- Concurrent (50): <100ms P95

### Database Operations
- Single record by ID: <50ms
- Complex joins: <100ms
- Aggregations: <150ms
- Concurrent (25): <400ms P95

### Pension Calculations
- CPP/QPP: 3-5ms average
- OTPP: 8-12ms average
- Rate lookups: <1ms (cached)
- Concurrent (100): <50ms average

### Insurance Adapters
- Initialization: 50-100ms
- Capabilities: <1ms
- Health checks: 200-500ms

## Best Practices

### 1. Warm-Up Before Measurement
Always use the `warmup()` function to eliminate cold start effects:
```typescript
await warmup(queryFn, 5);
const metrics = await measurePerformance(queryFn, 100);
```

### 2. Use Appropriate Iteration Counts
- Fast operations (< 5ms): 500-1000 iterations
- Medium operations (5-50ms): 100-500 iterations
- Slow operations (>50ms): 20-100 iterations

### 3. Set Realistic Thresholds
Base thresholds on business requirements and actual usage patterns:
```typescript
const thresholds: PerformanceThresholds = {
  avgTime: 100,      // Must respond within 100ms on average
  p95: 200,          // 95% under 200ms
  minThroughput: 50, // At least 50 req/sec
};
```

### 4. Monitor Memory Usage
Check for memory leaks in long-running tests:
```typescript
const metrics = await measurePerformance(fn, 1000);
expect(metrics.memoryUsedMB).toBeLessThan(50); // Should not grow unbounded
```

### 5. Test Concurrent Scenarios
Real applications face concurrent loads:
```typescript
const metrics = await measureConcurrentPerformance(fn, 50);
```

### 6. Use Batched Tests for Rate Limiting
Simulate rate-limited APIs:
```typescript
const metrics = await measureBatchedPerformance(fn, 500, 50); // 500 total, batches of 50
```

## CI/CD Integration

### GitHub Actions Example
```yaml
- name: Run Performance Tests
  run: pnpm test __tests__/performance/ --reporter=json --outputFile=perf-results.json

- name: Check Performance Thresholds
  run: node scripts/check-performance-thresholds.js perf-results.json
```

### Performance Regression Detection
Compare current results with baseline:
```typescript
const baseline = loadBaselineMetrics();
const current = await measurePerformance(fn, 100);
const comparison = compareMetrics(baseline, current);

if (comparison.avgTimeChange > 20) {
  console.warn(`Performance regression: ${comparison.avgTimeChange}% slower`);
}
```

## Troubleshooting

### Slow Test Execution
- Check database connection latency
- Verify test isolation (no interference between tests)
- Ensure adequate system resources

### High Variability
- Increase warmup iterations
- Run tests on dedicated hardware
- Avoid background processes during testing

### Memory Leaks
- Check for unclosed connections
- Verify event listener cleanup
- Review large object retention

### Failed Thresholds
- Review code changes since last baseline
- Check system resource availability
- Consider if thresholds are too aggressive

## Monitoring in Production

While these are test suites, use similar metrics in production:
- Instrument API endpoints with response time tracking
- Monitor database query performance
- Track memory usage trends
- Set up alerts for threshold violations

## Contributing

When adding new performance tests:
1. Use existing utilities from `performance-utils.ts`
2. Set realistic thresholds based on requirements
3. Include warmup phase
4. Test both average case and edge cases
5. Document expected performance characteristics
6. Add console output for key metrics

## Related Documentation

- [Testing Guide](./TESTING.md)
- [GraphQL API Documentation](../API_DOCUMENTATION_SPRINT_COMPLETE.md)
- [Database Schema](./DATABASE_SCHEMA.md)
- [Integration Patterns](./INTEGRATION_PATTERNS.md)

## Performance Test Structure

```
__tests__/performance/
├── performance-utils.ts                          # Shared utilities
├── graphql-api-performance.test.ts              # GraphQL operations
├── database-performance.test.ts                 # Database queries
├── pension-processor-performance.test.ts        # Pension calculations
├── insurance-adapter-performance.test.ts        # Integration adapters
├── concurrent-operations-performance.test.ts    # High concurrency
└── report-executor-performance.test.ts          # Report generation
```

## Metrics Dashboard (Future)

Consider integrating with:
- **Grafana**: Real-time performance dashboards
- **Prometheus**: Metrics collection and alerting
- **Datadog**: Application performance monitoring (APM)
- **New Relic**: Performance insights and tracing

---

**Note**: Performance test results can vary based on hardware, system load, and database state. Always run tests in consistent environments and compare trends over time rather than absolute values.
