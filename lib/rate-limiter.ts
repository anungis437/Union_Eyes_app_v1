/**
 * Rate Limiting Utility
 * 
 * Provides Redis-based rate limiting for API endpoints to prevent abuse
 * and protect expensive operations (AI services, external APIs, etc.)
 * 
 * Features:
 * - Sliding window rate limiting
 * - Per-user and per-organization limits
 * - Configurable time windows and thresholds
 * - Graceful degradation when Redis unavailable
 */

import { Redis } from '@upstash/redis';
import { logger } from './logger';

// Initialize Redis client (using Upstash for serverless-friendly Redis)
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

/**
 * Rate limit configuration
 */
interface RateLimitConfig {
  /** Maximum number of requests allowed */
  limit: number;
  /** Time window in seconds */
  window: number;
  /** Identifier for the rate limit bucket (e.g., 'ai-query', 'ml-predictions') */
  identifier: string;
}

/**
 * Rate limit result
 */
interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Current request count in the window */
  current: number;
  /** Maximum allowed requests */
  limit: number;
  /** Remaining requests in the window */
  remaining: number;
  /** Time in seconds until the window resets */
  resetIn: number;
}

/**
 * Check if a request should be rate limited
 * 
 * Uses sliding window algorithm with Redis for distributed rate limiting.
 * Falls back to allowing requests if Redis is unavailable (fail-open).
 * 
 * @param key - Unique identifier for the rate limit (e.g., userId, organizationId)
 * @param config - Rate limit configuration
 * @returns Rate limit result
 * 
 * @example
 * ```typescript
 * const result = await checkRateLimit(userId, {
 *   limit: 100,
 *   window: 3600,
 *   identifier: 'ai-query'
 * });
 * 
 * if (!result.allowed) {
 *   return NextResponse.json(
 *     { 
 *       error: 'Rate limit exceeded',
 *       resetIn: result.resetIn 
 *     },
 *     { 
 *       status: 429,
 *       headers: {
 *         'X-RateLimit-Limit': result.limit.toString(),
 *         'X-RateLimit-Remaining': result.remaining.toString(),
 *         'X-RateLimit-Reset': result.resetIn.toString(),
 *       }
 *     }
 *   );
 * }
 * ```
 */
export async function checkRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const { limit, window, identifier } = config;
  const redisKey = `ratelimit:${identifier}:${key}`;

  // If Redis is not configured, log warning and allow request (fail-open)
  if (!redis) {
    logger.warn('Redis not configured for rate limiting - allowing request', {
      key,
      identifier,
    });
    return {
      allowed: true,
      current: 0,
      limit,
      remaining: limit,
      resetIn: window,
    };
  }

  try {
    const now = Date.now();
    const windowStart = now - window * 1000;

    // Use Redis transaction to atomically:
    // 1. Remove old entries outside the window
    // 2. Count current requests in the window
    // 3. Add new request timestamp
    // 4. Set expiry on the key
    const pipeline = redis.pipeline();
    
    // Remove timestamps outside the current window
    pipeline.zremrangebyscore(redisKey, 0, windowStart);
    
    // Count requests in current window
    pipeline.zcard(redisKey);
    
    // Add current request timestamp
    pipeline.zadd(redisKey, { score: now, member: `${now}-${Math.random()}` });
    
    // Set expiry (window + 10 seconds buffer)
    pipeline.expire(redisKey, window + 10);

    const results = await pipeline.exec();
    
    // Extract count before adding current request
    const currentCount = (results[1] as number) || 0;
    const allowed = currentCount < limit;
    const remaining = Math.max(0, limit - currentCount - 1);

    return {
      allowed,
      current: currentCount + 1,
      limit,
      remaining,
      resetIn: window,
    };

  } catch (error) {
    // Log error but fail-open (allow request if Redis fails)
    logger.error('Rate limit check failed - allowing request', error as Error, {
      key,
      identifier,
      limit,
      window,
    });

    return {
      allowed: true,
      current: 0,
      limit,
      remaining: limit,
      resetIn: window,
    };
  }
}

/**
 * Predefined rate limit configurations for common use cases
 */
export const RATE_LIMITS = {
  // ===== EXPENSIVE OPERATIONS =====
  
  /**
   * AI Query endpoints (expensive Azure OpenAI calls)
   * 20 requests per hour per user
   */
  AI_QUERY: {
    limit: 20,
    window: 3600, // 1 hour
    identifier: 'ai-query',
  },

  /**
   * ML Predictions (expensive model inference)
   * 50 predictions per hour per user
   */
  ML_PREDICTIONS: {
    limit: 50,
    window: 3600, // 1 hour
    identifier: 'ml-predictions',
  },

  /**
   * Voice transcription (expensive Azure Speech API)
   * 100 transcriptions per hour per user
   */
  VOICE_TRANSCRIPTION: {
    limit: 100,
    window: 3600, // 1 hour
    identifier: 'voice-transcription',
  },

  /**
   * Export generation (resource-intensive PDF/Excel generation)
   * 50 exports per hour per organization
   */
  EXPORTS: {
    limit: 50,
    window: 3600, // 1 hour
    identifier: 'exports',
  },

  /**
   * Webhook endpoints (prevent DDoS attacks)
   * 1000 requests per 5 minutes per IP
   */
  WEBHOOKS: {
    limit: 1000,
    window: 300, // 5 minutes
    identifier: 'webhooks',
  },

  // ===== AUTHENTICATION & SECURITY =====
  
  /**
   * Authentication endpoints (sign-in, callbacks, password reset)
   * Strict limit to prevent brute force attacks
   * 5 attempts per 15 minutes per IP
   */
  AUTH: {
    limit: 5,
    window: 900, // 15 minutes
    identifier: 'auth',
  },

  /**
   * Sign-up endpoints (account creation)
   * Prevent spam account creation
   * 3 accounts per hour per IP
   */
  SIGNUP: {
    limit: 3,
    window: 3600, // 1 hour
    identifier: 'signup',
  },

  /**
   * Password reset requests
   * Prevent email bombing attacks
   * 3 requests per hour per IP
   */
  PASSWORD_RESET: {
    limit: 3,
    window: 3600, // 1 hour
    identifier: 'password-reset',
  },

  // ===== BUSINESS OPERATIONS =====
  
  /**
   * Claims submission (POST /api/claims)
   * Moderate limit to allow legitimate bulk submissions
   * 20 claims per minute per user
   */
  CLAIMS_CREATE: {
    limit: 20,
    window: 60, // 1 minute
    identifier: 'claims-create',
  },

  /**
   * Claims read operations (GET /api/claims)
   * Higher limit for read operations
   * 100 requests per minute per user
   */
  CLAIMS_READ: {
    limit: 100,
    window: 60, // 1 minute
    identifier: 'claims-read',
  },

  /**
   * Claims update/delete operations
   * Lower limit for write operations
   * 30 updates per minute per user
   */
  CLAIMS_WRITE: {
    limit: 30,
    window: 60, // 1 minute
    identifier: 'claims-write',
  },

  /**
   * Voting session creation (POST /api/voting/sessions)
   * Strict limit - voting sessions are sensitive
   * 5 sessions per hour per organization
   */
  VOTING_CREATE: {
    limit: 5,
    window: 3600, // 1 hour
    identifier: 'voting-create',
  },

  /**
   * Vote casting (POST /api/voting/sessions/:id/vote)
   * Moderate limit per user
   * 10 votes per minute per user
   */
  VOTING_CAST: {
    limit: 10,
    window: 60, // 1 minute
    identifier: 'voting-cast',
  },

  /**
   * Voting results (GET /api/voting/sessions/:id/results)
   * Higher limit for read operations
   * 60 requests per minute per user
   */
  VOTING_READ: {
    limit: 60,
    window: 60, // 1 minute
    identifier: 'voting-read',
  },

  /**
   * Organization creation (POST /api/organizations)
   * Very strict - organizations are sensitive
   * 2 per hour per user
   */
  ORG_CREATE: {
    limit: 2,
    window: 3600, // 1 hour
    identifier: 'org-create',
  },

  /**
   * Organization read operations (GET /api/organizations)
   * Higher limit for read operations
   * 100 requests per minute per user
   */
  ORG_READ: {
    limit: 100,
    window: 60, // 1 minute
    identifier: 'org-read',
  },

  /**
   * Organization update operations (PATCH /api/organizations/:id)
   * Moderate limit for updates
   * 20 updates per hour per user
   */
  ORG_WRITE: {
    limit: 20,
    window: 3600, // 1 hour
    identifier: 'org-write',
  },

  /**
   * Member operations (profile updates, role changes)
   * Moderate limit
   * 50 operations per hour per user
   */
  MEMBERS: {
    limit: 50,
    window: 3600, // 1 hour
    identifier: 'members',
  },

  // ===== FINANCIAL OPERATIONS =====
  
  /**
   * Dues payment processing (POST /api/portal/dues/pay)
   * Strict limit to prevent financial abuse
   * 10 payments per hour per user
   */
  DUES_PAYMENT: {
    limit: 10,
    window: 3600, // 1 hour
    identifier: 'dues-payment',
  },

  /**
   * Strike fund operations (GET/POST /api/strike/funds)
   * Moderate limit for financial operations
   * 15 operations per hour per user
   */
  STRIKE_FUND: {
    limit: 15,
    window: 3600, // 1 hour
    identifier: 'strike-fund',
  },

  /**
   * Strike stipend requests (POST /api/strike/stipends)
   * Strict limit for financial requests
   * 5 requests per hour per user
   */
  STRIKE_STIPEND: {
    limit: 5,
    window: 3600, // 1 hour
    identifier: 'strike-stipend',
  },

  /**
   * Tax slip generation (GET /api/tax/slips, POST /api/tax/t4a)
   * Moderate limit for tax operations
   * 20 requests per hour per user
   */
  TAX_OPERATIONS: {
    limit: 20,
    window: 3600, // 1 hour
    identifier: 'tax-operations',
  },

  /**
   * Pension operations (GET/POST /api/pension/*)
   * Moderate limit for pension operations
   * 30 operations per hour per user
   */
  PENSION_OPERATIONS: {
    limit: 30,
    window: 3600, // 1 hour
    identifier: 'pension-operations',
  },

  // ===== GENERAL API =====
  
  /**
   * General API rate limit (default for unspecified endpoints)
   * Generous limit for general operations
   * 1000 requests per hour per user
   */
  GENERAL_API: {
    limit: 1000,
    window: 3600, // 1 hour
    identifier: 'general-api',
  },

  /**
   * Upload endpoints (file uploads)
   * Moderate limit to prevent storage abuse
   * 50 uploads per hour per user
   */
  UPLOADS: {
    limit: 50,
    window: 3600, // 1 hour
    identifier: 'uploads',
  },
} as const;

/**
 * Helper to create rate limit response headers
 * 
 * @param result - Rate limit result
 * @returns Headers object for Next.js Response
 */
export function createRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.resetIn.toString(),
    'Retry-After': result.resetIn.toString(),
  };
}
