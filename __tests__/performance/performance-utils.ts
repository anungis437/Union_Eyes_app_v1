/**
 * Shared Performance Testing Utilities
 * 
 * Common functions and types for performance benchmarking across the application
 */

export interface PerformanceMetrics {
  executions: number;
  totalTime: number;
  avgTime: number;
  minTime: number;
  maxTime: number;
  p50: number;
  p95: number;
  p99: number;
  throughput: number; // requests per second
  memoryUsedMB?: number;
  opsPerSecond?: number;
}

export interface PerformanceThresholds {
  avgTime?: number;
  p95?: number;
  p99?: number;
  minThroughput?: number;
  maxMemoryMB?: number;
}

/**
 * Calculate percentile from sorted array
 */
export function calculatePercentile(sortedTimes: number[], percentile: number): number {
  const index = Math.ceil((percentile / 100) * sortedTimes.length) - 1;
  return sortedTimes[Math.max(0, index)];
}

/**
 * Format performance metrics for display
 */
export function formatMetrics(metrics: PerformanceMetrics): string {
  return `
Performance Metrics:
  Executions: ${metrics.executions}
  Total Time: ${metrics.totalTime.toFixed(2)}ms
  Average: ${metrics.avgTime.toFixed(2)}ms
  Min: ${metrics.minTime.toFixed(2)}ms
  Max: ${metrics.maxTime.toFixed(2)}ms
  P50: ${metrics.p50.toFixed(2)}ms
  P95: ${metrics.p95.toFixed(2)}ms
  P99: ${metrics.p99.toFixed(2)}ms
  Throughput: ${metrics.throughput.toFixed(2)} req/sec
  ${metrics.memoryUsedMB ? `Memory Used: ${metrics.memoryUsedMB.toFixed(2)}MB` : ''}
  ${metrics.opsPerSecond ? `Operations/sec: ${metrics.opsPerSecond.toFixed(2)}` : ''}
  `.trim();
}

/**
 * Validate metrics against thresholds
 */
export function validateThresholds(
  metrics: PerformanceMetrics,
  thresholds: PerformanceThresholds
): { passed: boolean; failures: string[] } {
  const failures: string[] = [];

  if (thresholds.avgTime && metrics.avgTime > thresholds.avgTime) {
    failures.push(`Average time ${metrics.avgTime.toFixed(2)}ms exceeds threshold ${thresholds.avgTime}ms`);
  }

  if (thresholds.p95 && metrics.p95 > thresholds.p95) {
    failures.push(`P95 ${metrics.p95.toFixed(2)}ms exceeds threshold ${thresholds.p95}ms`);
  }

  if (thresholds.p99 && metrics.p99 > thresholds.p99) {
    failures.push(`P99 ${metrics.p99.toFixed(2)}ms exceeds threshold ${thresholds.p99}ms`);
  }

  if (thresholds.minThroughput && metrics.throughput < thresholds.minThroughput) {
    failures.push(`Throughput ${metrics.throughput.toFixed(2)} req/sec below threshold ${thresholds.minThroughput} req/sec`);
  }

  if (thresholds.maxMemoryMB && metrics.memoryUsedMB && metrics.memoryUsedMB > thresholds.maxMemoryMB) {
    failures.push(`Memory ${metrics.memoryUsedMB.toFixed(2)}MB exceeds threshold ${thresholds.maxMemoryMB}MB`);
  }

  return {
    passed: failures.length === 0,
    failures,
  };
}

/**
 * Execute a performance test with timing
 */
export async function measurePerformance<T>(
  fn: () => Promise<T> | T,
  iterations: number
): Promise<PerformanceMetrics> {
  const times: number[] = [];
  const startMemory = process.memoryUsage().heapUsed;
  const overallStart = performance.now();

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await fn();
    const end = performance.now();
    times.push(end - start);
  }

  const overallEnd = performance.now();
  const endMemory = process.memoryUsage().heapUsed;
  const totalTime = overallEnd - overallStart;

  const sortedTimes = [...times].sort((a, b) => a - b);

  return {
    executions: iterations,
    totalTime,
    avgTime: times.reduce((sum, t) => sum + t, 0) / times.length,
    minTime: sortedTimes[0],
    maxTime: sortedTimes[sortedTimes.length - 1],
    p50: calculatePercentile(sortedTimes, 50),
    p95: calculatePercentile(sortedTimes, 95),
    p99: calculatePercentile(sortedTimes, 99),
    throughput: (iterations / totalTime) * 1000,
    memoryUsedMB: (endMemory - startMemory) / 1024 / 1024,
  };
}

/**
 * Execute concurrent performance test
 */
export async function measureConcurrentPerformance<T>(
  fn: () => Promise<T> | T,
  concurrency: number
): Promise<PerformanceMetrics> {
  const times: number[] = [];
  const startMemory = process.memoryUsage().heapUsed;
  const overallStart = performance.now();

  const promises = Array.from({ length: concurrency }, async () => {
    const start = performance.now();
    await fn();
    const end = performance.now();
    times.push(end - start);
  });

  await Promise.all(promises);

  const overallEnd = performance.now();
  const endMemory = process.memoryUsage().heapUsed;
  const totalTime = overallEnd - overallStart;

  const sortedTimes = [...times].sort((a, b) => a - b);

  return {
    executions: concurrency,
    totalTime,
    avgTime: times.reduce((sum, t) => sum + t, 0) / times.length,
    minTime: sortedTimes[0],
    maxTime: sortedTimes[sortedTimes.length - 1],
    p50: calculatePercentile(sortedTimes, 50),
    p95: calculatePercentile(sortedTimes, 95),
    p99: calculatePercentile(sortedTimes, 99),
    throughput: (concurrency / totalTime) * 1000,
    memoryUsedMB: (endMemory - startMemory) / 1024 / 1024,
  };
}

/**
 * Execute batched concurrent test with rate limiting
 */
export async function measureBatchedPerformance<T>(
  fn: () => Promise<T> | T,
  totalRequests: number,
  batchSize: number
): Promise<PerformanceMetrics> {
  const times: number[] = [];
  const startMemory = process.memoryUsage().heapUsed;
  const overallStart = performance.now();

  const batches = Math.ceil(totalRequests / batchSize);

  for (let batch = 0; batch < batches; batch++) {
    const currentBatchSize = Math.min(batchSize, totalRequests - batch * batchSize);
    
    const batchPromises = Array.from({ length: currentBatchSize }, async () => {
      const start = performance.now();
      await fn();
      const end = performance.now();
      times.push(end - start);
    });

    await Promise.all(batchPromises);
  }

  const overallEnd = performance.now();
  const endMemory = process.memoryUsage().heapUsed;
  const totalTime = overallEnd - overallStart;

  const sortedTimes = [...times].sort((a, b) => a - b);

  return {
    executions: totalRequests,
    totalTime,
    avgTime: times.reduce((sum, t) => sum + t, 0) / times.length,
    minTime: sortedTimes[0],
    maxTime: sortedTimes[sortedTimes.length - 1],
    p50: calculatePercentile(sortedTimes, 50),
    p95: calculatePercentile(sortedTimes, 95),
    p99: calculatePercentile(sortedTimes, 99),
    throughput: (totalRequests / totalTime) * 1000,
    memoryUsedMB: (endMemory - startMemory) / 1024 / 1024,
  };
}

/**
 * Warm up function to avoid cold start effects
 */
export async function warmup<T>(fn: () => Promise<T> | T, iterations = 5): Promise<void> {
  for (let i = 0; i < iterations; i++) {
    await fn();
  }
}

/**
 * Compare two performance metrics
 */
export function compareMetrics(
  baseline: PerformanceMetrics,
  current: PerformanceMetrics
): {
  avgTimeChange: number;
  p95Change: number;
  throughputChange: number;
  improved: boolean;
} {
  const avgTimeChange = ((current.avgTime - baseline.avgTime) / baseline.avgTime) * 100;
  const p95Change = ((current.p95 - baseline.p95) / baseline.p95) * 100;
  const throughputChange = ((current.throughput - baseline.throughput) / baseline.throughput) * 100;

  return {
    avgTimeChange,
    p95Change,
    throughputChange,
    improved: avgTimeChange < 0 && throughputChange > 0,
  };
}
