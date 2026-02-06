/**
 * Analytics Performance Monitor
 * 
 * Tracks and reports on analytics query performance
 * Helps identify slow queries and optimization opportunities
 * 
 * ⚠️ WARNING: Current implementation uses in-memory storage
 * - Metrics are lost on server restart
 * - Limited to MAX_METRICS (10,000) entries
 * - Not suitable for multi-instance deployments
 * 
 * RECOMMENDED: Migrate to Redis or database-backed storage for production
 * Consider using: Upstash Redis, PostgreSQL timeseries, or dedicated APM solution
 * 
 * Created: November 15, 2025
 * TODO: Implement persistent storage backend
 */

interface QueryMetric {
  endpoint: string;
  duration: number;
  timestamp: Date;
  cached: boolean;
  tenantId: string;
}

interface PerformanceReport {
  endpoint: string;
  totalCalls: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  cacheHitRate: number;
  slowQueries: number; // Queries > 1000ms
}

class AnalyticsPerformanceMonitor {
  private metrics: QueryMetric[] = [];
  private readonly MAX_METRICS = 10000; // Keep last 10k metrics
  private readonly SLOW_QUERY_THRESHOLD = 1000; // 1 second

  /**
   * Record a query execution
   */
  recordQuery(
    endpoint: string,
    duration: number,
    cached: boolean,
    tenantId: string
  ): void {
    this.metrics.push({
      endpoint,
      duration,
      timestamp: new Date(),
      cached,
      tenantId,
    });

    // Keep metrics array bounded
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }

    // Log slow queries
    if (duration > this.SLOW_QUERY_THRESHOLD) {
      console.warn(`[PERF] Slow query detected: ${endpoint} (${duration}ms) [cached: ${cached}]`);
    }
  }

  /**
   * Get performance report for an endpoint
   */
  getEndpointReport(endpoint: string): PerformanceReport | null {
    const endpointMetrics = this.metrics.filter(m => m.endpoint === endpoint);
    
    if (endpointMetrics.length === 0) {
      return null;
    }

    const durations = endpointMetrics.map(m => m.duration);
    const cachedCount = endpointMetrics.filter(m => m.cached).length;
    const slowCount = endpointMetrics.filter(m => m.duration > this.SLOW_QUERY_THRESHOLD).length;

    return {
      endpoint,
      totalCalls: endpointMetrics.length,
      avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      cacheHitRate: cachedCount / endpointMetrics.length,
      slowQueries: slowCount,
    };
  }

  /**
   * Get all endpoint reports
   */
  getAllReports(): PerformanceReport[] {
    const endpoints = Array.from(new Set(this.metrics.map(m => m.endpoint)));
    return endpoints
      .map(endpoint => this.getEndpointReport(endpoint))
      .filter((report): report is PerformanceReport => report !== null)
      .sort((a, b) => b.avgDuration - a.avgDuration); // Sort by slowest first
  }

  /**
   * Get recent slow queries
   */
  getSlowQueries(limit: number = 10): QueryMetric[] {
    return this.metrics
      .filter(m => m.duration > this.SLOW_QUERY_THRESHOLD)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  /**
   * Get metrics for a specific tenant
   */
  getTenantMetrics(tenantId: string): QueryMetric[] {
    return this.metrics.filter(m => m.tenantId === tenantId);
  }

  /**
   * Clear old metrics (older than N days)
   */
  clearOldMetrics(days: number = 7): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    this.metrics = this.metrics.filter(m => m.timestamp > cutoffDate);
  }

  /**
   * Get summary statistics
   */
  getSummary() {
    if (this.metrics.length === 0) {
      return null;
    }

    const durations = this.metrics.map(m => m.duration);
    const cachedCount = this.metrics.filter(m => m.cached).length;
    const slowCount = this.metrics.filter(m => m.duration > this.SLOW_QUERY_THRESHOLD).length;

    return {
      totalQueries: this.metrics.length,
      avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      medianDuration: this.calculateMedian(durations),
      p95Duration: this.calculatePercentile(durations, 95),
      p99Duration: this.calculatePercentile(durations, 99),
      cacheHitRate: cachedCount / this.metrics.length,
      slowQueryRate: slowCount / this.metrics.length,
      uniqueEndpoints: new Set(this.metrics.map(m => m.endpoint)).size,
      uniqueTenants: new Set(this.metrics.map(m => m.tenantId)).size,
    };
  }

  private calculateMedian(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  private calculatePercentile(values: number[], percentile: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }

  /**
   * Export metrics for external monitoring
   */
  exportMetrics() {
    return {
      summary: this.getSummary(),
      endpointReports: this.getAllReports(),
      slowQueries: this.getSlowQueries(20),
      recentMetrics: this.metrics.slice(-100), // Last 100 queries
    };
  }
}

// Singleton instance
export const performanceMonitor = new AnalyticsPerformanceMonitor();

/**
 * Middleware to track analytics query performance
 */
export function withPerformanceTracking<T>(
  endpoint: string,
  tenantId: string,
  cached: boolean,
  queryFn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  
  return queryFn()
    .then(result => {
      const duration = Date.now() - startTime;
      performanceMonitor.recordQuery(endpoint, duration, cached, tenantId);
      return result;
    })
    .catch(error => {
      const duration = Date.now() - startTime;
      performanceMonitor.recordQuery(endpoint, duration, cached, tenantId);
      throw error;
    });
}

/**
 * API endpoint to get performance metrics (for admins)
 */
export function getPerformanceMetrics() {
  return performanceMonitor.exportMetrics();
}
