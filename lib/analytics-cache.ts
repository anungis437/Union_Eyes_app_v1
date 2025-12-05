/**
 * Analytics Cache Service
 * 
 * Provides caching layer for analytics queries to improve performance
 * Uses in-memory cache with TTL (Time To Live) for frequently accessed metrics
 * 
 * Features:
 * - Automatic cache invalidation based on TTL
 * - Tenant-isolated caching
 * - Cache key generation
 * - Cache statistics
 * 
 * Created: November 15, 2025
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

class AnalyticsCacheService {
  private cache: Map<string, CacheEntry<any>>;
  private stats: { hits: number; misses: number };
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.cache = new Map();
    this.stats = { hits: 0, misses: 0 };
    
    // Cleanup expired entries every minute
    setInterval(() => this.cleanup(), 60 * 1000);
  }

  /**
   * Generate cache key from tenant, endpoint, and parameters
   */
  private generateKey(
    tenantId: string,
    endpoint: string,
    params: Record<string, any> = {}
  ): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    
    return `${tenantId}:${endpoint}:${sortedParams}`;
  }

  /**
   * Check if cache entry is still valid
   */
  private isValid(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  /**
   * Get cached data if available and valid
   */
  get<T>(
    tenantId: string,
    endpoint: string,
    params: Record<string, any> = {}
  ): T | null {
    const key = this.generateKey(tenantId, endpoint, params);
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (!this.isValid(entry)) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    entry.hits++;
    this.stats.hits++;
    return entry.data as T;
  }

  /**
   * Store data in cache
   */
  set<T>(
    tenantId: string,
    endpoint: string,
    data: T,
    params: Record<string, any> = {},
    ttl: number = this.DEFAULT_TTL
  ): void {
    const key = this.generateKey(tenantId, endpoint, params);
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      hits: 0,
    });
  }

  /**
   * Invalidate cache for specific endpoint or all tenant data
   */
  invalidate(tenantId: string, endpoint?: string): void {
    if (endpoint) {
      // Invalidate specific endpoint
      const prefix = `${tenantId}:${endpoint}:`;
      const keys = Array.from(this.cache.keys());
      for (const key of keys) {
        if (key.startsWith(prefix)) {
          this.cache.delete(key);
        }
      }
    } else {
      // Invalidate all tenant data
      const prefix = `${tenantId}:`;
      const keys = Array.from(this.cache.keys());
      for (const key of keys) {
        if (key.startsWith(prefix)) {
          this.cache.delete(key);
        }
      }
    }
  }

  /**
   * Remove expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());
    for (const [key, entry] of entries) {
      if (now - entry.timestamp >= entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: this.cache.size,
      hitRate: totalRequests > 0 ? this.stats.hits / totalRequests : 0,
    };
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0 };
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }
}

// Singleton instance
export const analyticsCache = new AnalyticsCacheService();

/**
 * Cached wrapper for analytics queries
 * 
 * Usage:
 * const data = await withCache(
 *   tenantId,
 *   'claims',
 *   { days: 30 },
 *   () => fetchClaimsAnalytics(tenantId, 30)
 * );
 */
export async function withCache<T>(
  tenantId: string,
  endpoint: string,
  params: Record<string, any>,
  fetchFn: () => Promise<T>,
  ttl?: number
): Promise<T> {
  // Try to get from cache
  const cached = analyticsCache.get<T>(tenantId, endpoint, params);
  if (cached !== null) {
    return cached;
  }

  // Fetch fresh data
  const data = await fetchFn();
  
  // Store in cache
  analyticsCache.set(tenantId, endpoint, data, params, ttl);
  
  return data;
}

/**
 * Invalidate analytics cache when data changes
 * Call this after creating/updating/deleting claims
 */
export function invalidateAnalyticsCache(tenantId: string): void {
  analyticsCache.invalidate(tenantId);
}
