/**
 * Redis Cache Service
 * 
 * Provides caching capabilities for:
 * - Session caching
 * - Query result caching
 * - Rate limiting
 * - Distributed locks
 * 
 * Uses Redis with ioredis client
 */

import Redis from 'ioredis';

// Redis client singleton
let redisClient: Redis | null = null;

/**
 * Initialize Redis connection
 */
export function initRedis(url?: string): Redis {
  if (redisClient) {
    return redisClient;
  }

  const connectionUrl = url || process.env.REDIS_URL || 'redis://localhost:6379';

  redisClient = new Redis(connectionUrl, {
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 100,
    enableReadyCheck: true,
    lazyConnect: true,
  });

  redisClient.on('error', (err) => {
    console.error('[Redis] Connection error:', err);
  });

  redisClient.on('connect', () => {
    console.log('[Redis] Connected');
  });

  return redisClient;
}

/**
 * Get Redis client (lazy initialization)
 */
export function getRedis(): Redis {
  if (!redisClient) {
    return initRedis();
  }
  return redisClient;
}

/**
 * Close Redis connection
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    console.log('[Redis] Connection closed');
  }
}

// ============== CACHE OPERATIONS ==============

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  namespace?: string;
}

/**
 * Get full cache key with namespace
 */
function getCacheKey(key: string, namespace?: string): string {
  return namespace ? `${namespace}:${key}` : key;
}

/**
 * Get value from cache
 */
export async function cacheGet<T>(
  key: string,
  options?: CacheOptions
): Promise<T | null> {
  const redis = getRedis();
  const cacheKey = getCacheKey(key, options?.namespace);
  
  try {
    const value = await redis.get(cacheKey);
    if (!value) return null;
    
    // Try to parse JSON, return string if not valid JSON
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as unknown as T;
    }
  } catch (error) {
    console.error(`[Cache] Get error for ${cacheKey}:`, error);
    return null;
  }
}

/**
 * Set value in cache
 */
export async function cacheSet(
  key: string,
  value: any,
  options?: CacheOptions
): Promise<boolean> {
  const redis = getRedis();
  const cacheKey = getCacheKey(key, options?.namespace);
  const ttl = options?.ttl || 300; // Default 5 minutes
  
  try {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    await redis.setex(cacheKey, ttl, serialized);
    return true;
  } catch (error) {
    console.error(`[Cache] Set error for ${cacheKey}:`, error);
    return false;
  }
}

/**
 * Delete value from cache
 */
export async function cacheDelete(
  key: string,
  options?: CacheOptions
): Promise<boolean> {
  const redis = getRedis();
  const cacheKey = getCacheKey(key, options?.namespace);
  
  try {
    await redis.del(cacheKey);
    return true;
  } catch (error) {
    console.error(`[Cache] Delete error for ${cacheKey}:`, error);
    return false;
  }
}

/**
 * Delete all keys matching a pattern
 */
export async function cacheDeletePattern(
  pattern: string,
  namespace?: string
): Promise<number> {
  const redis = getRedis();
  const fullPattern = namespace ? `${namespace}:${pattern}` : pattern;
  
  try {
    const keys = await redis.keys(fullPattern);
    if (keys.length === 0) return 0;
    
    await redis.del(...keys);
    return keys.length;
  } catch (error) {
    console.error(`[Cache] Delete pattern error for ${fullPattern}:`, error);
    return 0;
  }
}

/**
 * Check if key exists in cache
 */
export async function cacheExists(
  key: string,
  options?: CacheOptions
): Promise<boolean> {
  const redis = getRedis();
  const cacheKey = getCacheKey(key, options?.namespace);
  
  try {
    const result = await redis.exists(cacheKey);
    return result === 1;
  } catch (error) {
    console.error(`[Cache] Exists error for ${cacheKey}:`, error);
    return false;
  }
}

/**
 * Get or set cached value (cache-aside pattern)
 */
export async function cacheGetOrSet<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options?: CacheOptions
): Promise<T> {
  // Try to get from cache first
  const cached = await cacheGet<T>(key, options);
  if (cached !== null) {
    return cached;
  }
  
  // Fetch from source
  const value = await fetchFn();
  
  // Cache the result
  await cacheSet(key, value, options);
  
  return value;
}

// ============== SESSION CACHING ==============

export interface SessionCache {
  userId: string;
  organizationId: string;
  roles: string[];
  expiresAt: Date;
}

/**
 * Cache session data
 */
export async function cacheSession(
  sessionId: string,
  session: SessionCache,
  ttl = 3600 // 1 hour
): Promise<boolean> {
  return cacheSet(`session:${sessionId}`, session, { ttl, namespace: 'session' });
}

/**
 * Get cached session
 */
export async function getCachedSession(
  sessionId: string
): Promise<SessionCache | null> {
  return cacheGet<SessionCache>(sessionId, { namespace: 'session' });
}

/**
 * Invalidate session cache
 */
export async function invalidateSession(
  sessionId: string
): Promise<boolean> {
  return cacheDelete(sessionId, { namespace: 'session' });
}

// ============== RATE LIMITING ==============

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
  windowSeconds: number;
}

/**
 * Check rate limit using sliding window
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
  namespace = 'ratelimit'
): Promise<RateLimitResult> {
  const redis = getRedis();
  const cacheKey = `${namespace}:${key}`;
  const now = Date.now();
  const windowStart = now - (windowSeconds * 1000);
  
  try {
    // Remove old entries
    await redis.zremrangebyscore(cacheKey, '-inf', windowStart);
    
    // Count current requests
    const count = await redis.zcard(cacheKey);
    
    if (count >= limit) {
      // Get the oldest entry to calculate reset time
      const oldest = await redis.zrange(cacheKey, 0, 0, 'WITHSCORES');
      const resetAt = oldest[1] ? parseInt(oldest[1]) + windowSeconds * 1000 : now + windowSeconds * 1000;
      
      return {
        allowed: false,
        remaining: 0,
        resetAt,
        limit,
        windowSeconds,
      };
    }
    
    // Add current request
    await redis.zadd(cacheKey, now, `${now}-${Math.random()}`);
    await redis.expire(cacheKey, windowSeconds);
    
    return {
      allowed: true,
      remaining: limit - count - 1,
      resetAt: now + windowSeconds * 1000,
      limit,
      windowSeconds,
    };
  } catch (error) {
    console.error(`[RateLimit] Error for ${cacheKey}:`, error);
    // Fail open - allow the request if Redis is unavailable
    return {
      allowed: true,
      remaining: limit - 1,
      resetAt: now + windowSeconds * 1000,
      limit,
      windowSeconds,
    };
  }
}

/**
 * Simple fixed window rate limiter (faster but less accurate)
 */
export async function checkFixedRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
  namespace = 'ratelimit'
): Promise<RateLimitResult> {
  const redis = getRedis();
  const cacheKey = `${namespace}:${key}:${Math.floor(Date.now() / (windowSeconds * 1000))}`;
  
  try {
    const current = await redis.get(cacheKey);
    const count = parseInt(current || '0');
    
    if (count >= limit) {
      const windowStart = Math.floor(Date.now() / (windowSeconds * 1000)) * windowSeconds * 1000;
      return {
        allowed: false,
        remaining: 0,
        resetAt: windowStart + windowSeconds * 1000,
        limit,
        windowSeconds,
      };
    }
    
    await redis.incr(cacheKey);
    await redis.expire(cacheKey, windowSeconds);
    
    return {
      allowed: true,
      remaining: limit - count - 1,
      resetAt: Math.floor(Date.now() / (windowSeconds * 1000)) * windowSeconds * 1000 + windowSeconds * 1000,
      limit,
      windowSeconds,
    };
  } catch (error) {
    console.error(`[RateLimit] Fixed error for ${cacheKey}:`, error);
    return {
      allowed: true,
      remaining: limit - 1,
      resetAt: Date.now() + windowSeconds * 1000,
      limit,
      windowSeconds,
    };
  }
}

// ============== DISTRIBUTED LOCKS ==============

/**
 * Acquire a distributed lock
 * Returns lock token if acquired, null otherwise
 */
export async function acquireLock(
  lockName: string,
  ttlSeconds = 30,
  namespace = 'lock'
): Promise<string | null> {
  const redis = getRedis();
  const lockKey = `${namespace}:${lockName}`;
  const token = `${Date.now()}-${Math.random()}`;
  
  try {
    // Try to set NX (only if not exists)
    const result = await redis.set(lockKey, token, 'EX', ttlSeconds, 'NX');
    return result === 'OK' ? token : null;
  } catch (error) {
    console.error(`[Lock] Acquire error for ${lockName}:`, error);
    return null;
  }
}

/**
 * Release a distributed lock
 * Only releases if the token matches
 */
export async function releaseLock(
  lockName: string,
  token: string,
  namespace = 'lock'
): Promise<boolean> {
  const redis = getRedis();
  const lockKey = `${namespace}:${lockName}`;
  
  try {
    // Lua script to atomically check and delete
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    
    const result = await redis.eval(script, 1, lockKey, token);
    return result === 1;
  } catch (error) {
    console.error(`[Lock] Release error for ${lockName}:`, error);
    return false;
  }
}

/**
 * Extend lock TTL
 */
export async function extendLock(
  lockName: string,
  token: string,
  ttlSeconds: number,
  namespace = 'lock'
): Promise<boolean> {
  const redis = getRedis();
  const lockKey = `${namespace}:${lockName}`;
  
  try {
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("expire", KEYS[1], ARGV[2])
      else
        return 0
      end
    `;
    
    const result = await redis.eval(script, 1, lockKey, token, ttlSeconds);
    return result === 1;
  } catch (error) {
    console.error(`[Lock] Extend error for ${lockName}:`, error);
    return false;
  }
}

// ============== UTILITY FUNCTIONS ==============

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  connected: boolean;
  memory: string;
  keys: number;
}> {
  const redis = getRedis();
  
  try {
    const info = await redis.info('memory');
    const keyCount = await redis.dbsize();
    
    return {
      connected: true,
      memory: info,
      keys: keyCount,
    };
  } catch (error) {
    return {
      connected: false,
      memory: 'Unknown',
      keys: 0,
    };
  }
}

/**
 * Ping Redis to check connection
 */
export async function pingRedis(): Promise<boolean> {
  try {
    const redis = getRedis();
    const result = await redis.ping();
    return result === 'PONG';
  } catch {
    return false;
  }
}
