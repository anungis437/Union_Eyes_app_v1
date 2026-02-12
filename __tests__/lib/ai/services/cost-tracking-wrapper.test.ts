/**
 * Tests for Cost Tracking Wrapper Service
 * 
 * Tests end-to-end cost tracking functionality including
 * rate limiting, cost calculation, and metrics recording.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('@/db', () => ({
  db: {
    insert: vi.fn(() => ({
      values: vi.fn().mockResolvedValue({}),
    })),
    query: {
      aiBudgets: {
        findFirst: vi.fn(),
      },
    },
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('@/lib/ai/services/rate-limiter', () => ({
  aiRateLimiter: {
    checkLimit: vi.fn(),
    recordUsage: vi.fn(),
    getUsageStats: vi.fn(),
  },
}));

vi.mock('@/lib/ai/services/token-cost-calculator', () => ({
  tokenCostCalculator: {
    estimateTokens: vi.fn((text: string) => Math.ceil(text.length / 4)),
    getModelPricing: vi.fn((model: string) => {
      if (model === 'gpt-4') {
        return { provider: 'openai', inputCostPer1M: 30, outputCostPer1M: 60 };
      }
      return null;
    }),
    calculateCost: vi.fn((model: string, input: number, output: number) => {
      if (model === 'gpt-4') {
        return (input * 30 + output * 60) / 1000000;
      }
      return 0.01;
    }),
  },
}));

// Import after mocks
import { CostTrackingWrapper, costTrackingWrapper } from '@/lib/ai/services/cost-tracking-wrapper';
import { aiRateLimiter } from '@/lib/ai/services/rate-limiter';
import { tokenCostCalculator } from '@/lib/ai/services/token-cost-calculator';
import { db } from '@/db';
import { logger } from '@/lib/logger';

describe('CostTrackingWrapper', () => {
  let wrapper: CostTrackingWrapper;

  beforeEach(() => {
    wrapper = new CostTrackingWrapper();
    vi.clearAllMocks();
  });

  describe('trackLLMCall', () => {
    it('should successfully track an LLM call with cost and usage', async () => {
      // Mock rate limiter to allow request
      vi.mocked(aiRateLimiter.checkLimit).mockResolvedValueOnce({
        allowed: true,
        currentUsage: { requests: 10, tokens: 5000, costUSD: 1.0 },
      });

      // Mock API response with OpenAI format
      const mockApiResponse = {
        choices: [{ message: { content: 'Hello! How can I help you?' } }],
        usage: {
          prompt_tokens: 20,
          completion_tokens: 10,
          total_tokens: 30,
        },
      };

      const apiCallFn = vi.fn().mockResolvedValue(mockApiResponse);

      const result = await wrapper.trackLLMCall(
        'org-1',
        'user-1',
        {
          provider: 'openai',
          model: 'gpt-4',
          messages: [{ role: 'user', content: 'Hello' }],
        },
        apiCallFn
      );

      // Verify success
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockApiResponse);
        expect(result.usage.inputTokens).toBe(20);
        expect(result.usage.outputTokens).toBe(10);
        expect(result.usage.totalTokens).toBe(30);
        expect(result.usage.costUSD).toBeGreaterThan(0);
        expect(result.latencyMs).toBeGreaterThanOrEqual(0);
      }

      // Verify rate limiter was checked
      expect(aiRateLimiter.checkLimit).toHaveBeenCalledWith(
        'org-1',
        expect.any(Number),
        expect.any(Number)
      );

      // Verify API was called
      expect(apiCallFn).toHaveBeenCalled();

      // Verify usage was recorded to Redis
      expect(aiRateLimiter.recordUsage).toHaveBeenCalledWith(
        'org-1',
        30,
        expect.any(Number)
      );

      // Verify metrics were recorded to database
      expect(db.insert).toHaveBeenCalled();
    });

    it('should block request when rate limit exceeded', async () => {
      vi.mocked(aiRateLimiter.checkLimit).mockResolvedValueOnce({
        allowed: false,
        reason: 'Rate limit exceeded: requests per minute',
        retryAfter: 30,
        currentUsage: { requests: 60, tokens: 5000, costUSD: 1.0 },
      });

      const apiCallFn = vi.fn();

      const result = await wrapper.trackLLMCall(
        'org-1',
        'user-1',
        {
          provider: 'openai',
          model: 'gpt-4',
          messages: [{ role: 'user', content: 'Hello' }],
        },
        apiCallFn
      );

      // Verify blocked
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Rate limit exceeded');
        expect(result.rateLimitInfo?.retryAfter).toBe(30);
      }

      // Verify API was NOT called
      expect(apiCallFn).not.toHaveBeenCalled();

      // Verify no usage recorded
      expect(aiRateLimiter.recordUsage).not.toHaveBeenCalled();
    });

    it('should handle API call failures gracefully', async () => {
      vi.mocked(aiRateLimiter.checkLimit).mockResolvedValueOnce({
        allowed: true,
        currentUsage: { requests: 10, tokens: 5000, costUSD: 1.0 },
      });

      const apiError = new Error('API request failed');
      const apiCallFn = vi.fn().mockRejectedValue(apiError);

      const result = await wrapper.trackLLMCall(
        'org-1',
        'user-1',
        {
          provider: 'openai',
          model: 'gpt-4',
          messages: [{ role: 'user', content: 'Hello' }],
        },
        apiCallFn
      );

      // Verify error result
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('API request failed');
      }

      // Verify error was logged
      expect(logger.error).toHaveBeenCalled();

      // Verify failed request was still recorded (with 0 tokens)
      expect(db.insert).toHaveBeenCalled();
    });

    it('should handle Anthropic response format', async () => {
      vi.mocked(aiRateLimiter.checkLimit).mockResolvedValueOnce({
        allowed: true,
        currentUsage: { requests: 10, tokens: 5000, costUSD: 1.0 },
      });

      // Anthropic Claude response format
      const mockApiResponse = {
        content: [{ text: 'I am Claude, an AI assistant.' }],
        usage: {
          input_tokens: 15,
          output_tokens: 12,
        },
      };

      const apiCallFn = vi.fn().mockResolvedValue(mockApiResponse);

      const result = await wrapper.trackLLMCall(
        'org-1',
        'user-1',
        {
          provider: 'anthropic',
          model: 'claude-3-5-sonnet-20241022',
          messages: [{ role: 'user', content: 'Who are you?' }],
        },
        apiCallFn
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.usage.inputTokens).toBe(15);
        expect(result.usage.outputTokens).toBe(12);
        expect(result.usage.totalTokens).toBe(27);
      }
    });

    it('should handle Google Gemini response format', async () => {
      vi.mocked(aiRateLimiter.checkLimit).mockResolvedValueOnce({
        allowed: true,
        currentUsage: { requests: 10, tokens: 5000, costUSD: 1.0 },
      });

      // Google Gemini response format
      const mockApiResponse = {
        candidates: [
          {
            content: {
              parts: [{ text: 'I am Gemini, a large language model.' }],
            },
          },
        ],
        usageMetadata: {
          promptTokenCount: 18,
          candidatesTokenCount: 14,
          totalTokenCount: 32,
        },
      };

      const apiCallFn = vi.fn().mockResolvedValue(mockApiResponse);

      const result = await wrapper.trackLLMCall(
        'org-1',
        'user-1',
        {
          provider: 'google',
          model: 'gemini-1.5-pro',
          messages: [{ role: 'user', content: 'Who are you?' }],
        },
        apiCallFn
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.usage.inputTokens).toBe(18);
        expect(result.usage.outputTokens).toBe(14);
        expect(result.usage.totalTokens).toBe(32);
      }
    });

    it('should estimate tokens when usage data is missing', async () => {
      vi.mocked(aiRateLimiter.checkLimit).mockResolvedValueOnce({
        allowed: true,
        currentUsage: { requests: 10, tokens: 5000, costUSD: 1.0 },
      });

      // Response without usage metadata
      const mockApiResponse = {
        choices: [{ message: { content: 'Response without usage data' } }],
      };

      const apiCallFn = vi.fn().mockResolvedValue(mockApiResponse);

      const result = await wrapper.trackLLMCall(
        'org-1',
        'user-1',
        {
          provider: 'openai',
          model: 'gpt-4',
          messages: [{ role: 'user', content: 'Hello' }],
        },
        apiCallFn
      );

      expect(result.success).toBe(true);
      if (result.success) {
        // Should have estimated tokens from response text
        expect(result.usage.outputTokens).toBeGreaterThan(0);
        expect(logger.warn).toHaveBeenCalledWith(
          expect.stringContaining('Could not extract token usage'),
          expect.any(Object)
        );
      }
    });
  });

  describe('getUsageSummary', () => {
    it('should return usage summary with budget and rate limits', async () => {
      const mockBudget = {
        organizationId: 'org-1',
        monthlyLimitUsd: '100.00',
        currentSpendUsd: '45.50',
        billingPeriodEnd: '2024-02-01',
      };

      vi.mocked(db.query.aiBudgets.findFirst).mockResolvedValueOnce(mockBudget as any);

      vi.mocked(aiRateLimiter.getUsageStats).mockResolvedValueOnce({
        requestsThisMinute: 12,
        tokensThisHour: 8500,
        costToday: 3.25,
      });

      const summary = await wrapper.getUsageSummary('org-1');

      expect(summary.budget).not.toBeNull();
      expect(summary.budget?.monthlyLimit).toBe(100.0);
      expect(summary.budget?.currentSpend).toBe(45.5);
      expect(summary.budget?.percentUsed).toBeCloseTo(45.5, 1);
      expect(summary.budget?.periodEnd).toBe('2024-02-01');

      expect(summary.rateLimits).toEqual({
        requestsThisMinute: 12,
        tokensThisHour: 8500,
        costToday: 3.25,
      });
    });

    it('should return null budget when not configured', async () => {
      vi.mocked(db.query.aiBudgets.findFirst).mockResolvedValueOnce(undefined);

      vi.mocked(aiRateLimiter.getUsageStats).mockResolvedValueOnce({
        requestsThisMinute: 5,
        tokensThisHour: 2000,
        costToday: 0.5,
      });

      const summary = await wrapper.getUsageSummary('org-1');

      expect(summary.budget).toBeNull();
      expect(summary.rateLimits).toBeDefined();
    });

    it('should handle errors and return defaults', async () => {
      vi.mocked(db.query.aiBudgets.findFirst).mockRejectedValueOnce(new Error('DB error'));

      const summary = await wrapper.getUsageSummary('org-1');

      expect(summary.budget).toBeNull();
      expect(summary.rateLimits).toEqual({
        requestsThisMinute: 0,
        tokensThisHour: 0,
        costToday: 0,
      });
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('costTrackingWrapper singleton', () => {
    it('should export singleton instance', () => {
      expect(costTrackingWrapper).toBeInstanceOf(CostTrackingWrapper);
    });

    it('should work with singleton instance', async () => {
      vi.mocked(aiRateLimiter.checkLimit).mockResolvedValueOnce({
        allowed: true,
        currentUsage: { requests: 0, tokens: 0, costUSD: 0 },
      });

      const apiCallFn = vi.fn().mockResolvedValue({
        choices: [{ message: { content: 'Test' } }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      });

      const result = await costTrackingWrapper.trackLLMCall(
        'org-1',
        'user-1',
        {
          provider: 'openai',
          model: 'gpt-4',
          messages: [{ role: 'user', content: 'Test' }],
        },
        apiCallFn
      );

      expect(result.success).toBe(true);
    });
  });

  describe('Integration scenarios', () => {
    it('should track multiple calls and accumulate metrics', async () => {
      vi.mocked(aiRateLimiter.checkLimit).mockResolvedValue({
        allowed: true,
        currentUsage: { requests: 0, tokens: 0, costUSD: 0 },
      });

      const apiCallFn = vi.fn().mockResolvedValue({
        choices: [{ message: { content: 'Response' } }],
        usage: { prompt_tokens: 20, completion_tokens: 10, total_tokens: 30 },
      });

      // Make 3 calls
      await wrapper.trackLLMCall('org-1', 'user-1', { provider: 'openai', model: 'gpt-4', messages: [] }, apiCallFn);
      await wrapper.trackLLMCall('org-1', 'user-1', { provider: 'openai', model: 'gpt-4', messages: [] }, apiCallFn);
      await wrapper.trackLLMCall('org-1', 'user-1', { provider: 'openai', model: 'gpt-4', messages: [] }, apiCallFn);

      // Verify all calls were tracked
      expect(aiRateLimiter.checkLimit).toHaveBeenCalledTimes(3);
      expect(aiRateLimiter.recordUsage).toHaveBeenCalledTimes(3);
      expect(db.insert).toHaveBeenCalledTimes(3);
    });

    it('should handle mixed success and failure calls', async () => {
      vi.mocked(aiRateLimiter.checkLimit).mockResolvedValue({
        allowed: true,
        currentUsage: { requests: 0, tokens: 0, costUSD: 0 },
      });

      const successFn = vi.fn().mockResolvedValue({
        choices: [{ message: { content: 'Success' } }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      });

      const failFn = vi.fn().mockRejectedValue(new Error('API error'));

      // Success call
      const result1 = await wrapper.trackLLMCall('org-1', 'user-1', { provider: 'openai', model: 'gpt-4', messages: [] }, successFn);
      expect(result1.success).toBe(true);

      // Failure call
      const result2 = await wrapper.trackLLMCall('org-1', 'user-1', { provider: 'openai', model: 'gpt-4', messages: [] }, failFn);
      expect(result2.success).toBe(false);

      // Both should be recorded
      expect(db.insert).toHaveBeenCalledTimes(2);
    });
  });
});
