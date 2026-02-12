/**
 * Tests for AI Rate Limiter Service
 * 
 * Tests rate limiting functionality with Redis for distributed rate limiting.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Redis } from '@upstash/redis';

// Mock Redis
vi.mock('@upstash/redis', () => ({
  Redis: vi.fn(() => ({
    get: vi.fn(),
    incr: vi.fn(),
    incrby: vi.fn(),
    expire: vi.fn(),
    keys: vi.fn(),
    del: vi.fn(),
    pipeline: vi.fn(() => ({
      incr: vi.fn().mockReturnThis(),
      expire: vi.fn().mockReturnThis(),
      incrby: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([]),
    })),
  })),
}));

// Mock database
vi.mock('@/db', () => ({
  db: {
    query: {
      aiBudgets: {
        findFirst: vi.fn(),
      },
    },
  },
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

// Import after mocks
import { AIRateLimiter, aiRateLimiter } from '@/lib/ai/services/rate-limiter';
import { db } from '@/db';
import { logger } from '@/lib/logger';

describe('AIRateLimiter', () => {
  let rateLimiter: AIRateLimiter;
  let mockRedis: any;

  beforeEach(() => {
    rateLimiter = new AIRateLimiter();
    mockRedis = new Redis();
    vi.clearAllMocks();
  });

  describe('checkLimit', () => {
    it('should allow request when under all limits', async () => {
      // Mock Redis responses - current usage is low
      mockRedis.get.mockResolvedValueOnce('10'); // requests: 10/60
      mockRedis.get.mockResolvedValueOnce('5000'); // tokens: 5000/100000
      mockRedis.get.mockResolvedValueOnce('100'); // cost: $1.00/day

      // Mock budget
      vi.mocked(db.query.aiBudgets.findFirst).mockResolvedValueOnce({
        id: 'budget-1',
        organizationId: 'org-1',
        monthlyLimitUsd: '100.00',
        currentSpendUsd: '10.00',
        alertThreshold: '0.80',
        hardLimit: true,
        billingPeriodStart: '2024-01-01',
        billingPeriodEnd: '2024-02-01',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const result = await rateLimiter.checkLimit('org-1', 100, 0.01);

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
      expect(result.currentUsage).toEqual({
        requests: 10,
        tokens: 5000,
        costUSD: 1.0,
      });
    });

    it('should block request when requests per minute exceeded', async () => {
      mockRedis.get.mockResolvedValueOnce('60'); // requests: 60/60 (at limit)
      mockRedis.get.mockResolvedValueOnce('5000');
      mockRedis.get.mockResolvedValueOnce('100');

      vi.mocked(db.query.aiBudgets.findFirst).mockResolvedValueOnce({
        id: 'budget-1',
        organizationId: 'org-1',
        monthlyLimitUsd: '100.00',
        currentSpendUsd: '10.00',
        hardLimit: true,
        billingPeriodEnd: '2024-12-31',
      } as any);

      const result = await rateLimiter.checkLimit('org-1', 100, 0.01);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('requests per minute');
      expect(result.retryAfter).toBeGreaterThan(0);
      expect(result.retryAfter).toBeLessThanOrEqual(60);
    });

    it('should block request when tokens per hour exceeded', async () => {
      mockRedis.get.mockResolvedValueOnce('10');
      mockRedis.get.mockResolvedValueOnce('99900'); // tokens: 99900/100000
      mockRedis.get.mockResolvedValueOnce('100');

      vi.mocked(db.query.aiBudgets.findFirst).mockResolvedValueOnce({
        id: 'budget-1',
        organizationId: 'org-1',
        monthlyLimitUsd: '100.00',
        currentSpendUsd: '10.00',
        hardLimit: true,
        billingPeriodEnd: '2024-12-31',
      } as any);

      const result = await rateLimiter.checkLimit('org-1', 200, 0.01);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('tokens per hour');
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('should block request when budget with hard limit exceeded', async () => {
      mockRedis.get.mockResolvedValueOnce('10');
      mockRedis.get.mockResolvedValueOnce('5000');
      mockRedis.get.mockResolvedValueOnce('9990'); // cost: $99.90

      vi.mocked(db.query.aiBudgets.findFirst).mockResolvedValueOnce({
        id: 'budget-1',
        organizationId: 'org-1',
        monthlyLimitUsd: '100.00',
        currentSpendUsd: '99.90',
        hardLimit: true,
        billingPeriodEnd: '2024-12-31',
      } as any);

      const result = await rateLimiter.checkLimit('org-1', 100, 0.20);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Budget exceeded');
      expect(result.reason).toContain('100.10');
    });

    it('should allow request when budget exceeded but hard limit disabled', async () => {
      mockRedis.get.mockResolvedValueOnce('10');
      mockRedis.get.mockResolvedValueOnce('5000');
      mockRedis.get.mockResolvedValueOnce('10100'); // cost: $101 (over budget)

      vi.mocked(db.query.aiBudgets.findFirst).mockResolvedValueOnce({
        id: 'budget-1',
        organizationId: 'org-1',
        monthlyLimitUsd: '100.00',
        currentSpendUsd: '101.00',
        hardLimit: false, // Soft limit - allow overruns
        billingPeriodEnd: '2024-12-31',
      } as any);

      const result = await rateLimiter.checkLimit('org-1', 100, 0.01);

      expect(result.allowed).toBe(true);
    });

    it('should allow request when no budget configured', async () => {
      mockRedis.get.mockResolvedValueOnce('10');
      mockRedis.get.mockResolvedValueOnce('5000');
      mockRedis.get.mockResolvedValueOnce('100');

      vi.mocked(db.query.aiBudgets.findFirst).mockResolvedValueOnce(undefined);

      const result = await rateLimiter.checkLimit('org-1', 100, 0.01);

      expect(result.allowed).toBe(true);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ organizationId: 'org-1' })
      );
    });

    it('should fail open when Redis is unavailable', async () => {
      // Create rate limiter when UPSTASH env vars are not set
      const originalEnv = process.env;
      process.env = { ...originalEnv };
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;

      const rateLimiterNoRedis = new AIRateLimiter();
      const result = await rateLimiterNoRedis.checkLimit('org-1', 100, 0.01);

      expect(result.allowed).toBe(true);
      expect(logger.error).toHaveBeenCalledWith('Redis not available for rate limiting');

      process.env = originalEnv;
    });

    it('should fail open when Redis throws error', async () => {
      mockRedis.get.mockRejectedValueOnce(new Error('Redis connection failed'));

      const result = await rateLimiter.checkLimit('org-1', 100, 0.01);

      expect(result.allowed).toBe(true);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('recordUsage', () => {
    it('should record usage with correct TTLs', async () => {
      const pipeline = {
        incr: vi.fn().mockReturnThis(),
        expire: vi.fn().mockReturnThis(),
        incrby: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([]),
      };
      mockRedis.pipeline.mockReturnValue(pipeline);

      await rateLimiter.recordUsage('org-1', 1000, 0.05);

      expect(mockRedis.pipeline).toHaveBeenCalled();
      expect(pipeline.incr).toHaveBeenCalledWith(expect.stringContaining('requests'));
      expect(pipeline.expire).toHaveBeenCalledWith(expect.anything(), 120); // 2 minutes
      expect(pipeline.incrby).toHaveBeenCalledWith(expect.stringContaining('tokens'), 1000);
      expect(pipeline.expire).toHaveBeenCalledWith(expect.anything(), 7200); // 2 hours
      expect(pipeline.incrby).toHaveBeenCalledWith(expect.stringContaining('cost'), 5); // $0.05 = 5 cents
      expect(pipeline.expire).toHaveBeenCalledWith(expect.anything(), 86400 * 32); // 32 days
      expect(pipeline.exec).toHaveBeenCalled();
    });

    it('should handle recording errors gracefully', async () => {
      mockRedis.pipeline.mockReturnValue({
        incr: vi.fn().mockReturnThis(),
        expire: vi.fn().mockReturnThis(),
        incrby: vi.fn().mockReturnThis(),
        exec: vi.fn().mockRejectedValue(new Error('Pipeline failed')),
      });

      await expect(rateLimiter.recordUsage('org-1', 1000, 0.05)).resolves.not.toThrow();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('getUsageStats', () => {
    it('should return current usage statistics', async () => {
      mockRedis.get.mockResolvedValueOnce('15'); // requests
      mockRedis.get.mockResolvedValueOnce('8000'); // tokens
      mockRedis.get.mockResolvedValueOnce('250'); // cost (cents)

      const stats = await rateLimiter.getUsageStats('org-1');

      expect(stats).toEqual({
        requestsThisMinute: 15,
        tokensThisHour: 8000,
        costToday: 2.50,
      });
    });

    it('should return zeros when no usage recorded', async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      mockRedis.get.mockResolvedValueOnce(null);
      mockRedis.get.mockResolvedValueOnce(null);

      const stats = await rateLimiter.getUsageStats('org-1');

      expect(stats).toEqual({
        requestsThisMinute: 0,
        tokensThisHour: 0,
        costToday: 0,
      });
    });

    it('should handle errors and return zeros', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis error'));

      const stats = await rateLimiter.getUsageStats('org-1');

      expect(stats).toEqual({
        requestsThisMinute: 0,
        tokensThisHour: 0,
        costToday: 0,
      });
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('resetLimits', () => {
    it('should delete all rate limit keys for organization', async () => {
      const keys = [
        'ratelimit:org-1:requests:123456',
        'ratelimit:org-1:tokens:123456',
        'ratelimit:org-1:cost:2024-01-15',
      ];
      mockRedis.keys.mockResolvedValueOnce(keys);
      mockRedis.del.mockResolvedValueOnce(3);

      await rateLimiter.resetLimits('org-1');

      expect(mockRedis.keys).toHaveBeenCalledWith('ratelimit:org-1:*');
      expect(mockRedis.del).toHaveBeenCalledWith(...keys);
      expect(logger.info).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ organizationId: 'org-1', keysDeleted: 3 })
      );
    });

    it('should handle no keys to delete', async () => {
      mockRedis.keys.mockResolvedValueOnce([]);

      await rateLimiter.resetLimits('org-1');

      expect(mockRedis.keys).toHaveBeenCalled();
      expect(mockRedis.del).not.toHaveBeenCalled();
    });

    it('should handle reset errors gracefully', async () => {
      mockRedis.keys.mockRejectedValueOnce(new Error('Redis error'));

      await expect(rateLimiter.resetLimits('org-1')).resolves.not.toThrow();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('aiRateLimiter singleton', () => {
    it('should export singleton instance', () => {
      expect(aiRateLimiter).toBeInstanceOf(AIRateLimiter);
    });

    it('should work with singleton instance', async () => {
      mockRedis.get.mockResolvedValue('0');
      vi.mocked(db.query.aiBudgets.findFirst).mockResolvedValueOnce({
        hardLimit: true,
        monthlyLimitUsd: '100.00',
        billingPeriodEnd: '2024-12-31',
      } as any);

      const result = await aiRateLimiter.checkLimit('org-1', 100, 0.01);
      expect(result.allowed).toBe(true);
    });
  });
});
