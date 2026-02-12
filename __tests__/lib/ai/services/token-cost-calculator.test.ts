/**
 * Tests for Token Cost Calculator Service
 * 
 * Tests the core cost calculation functionality for various LLM providers.
 */

import { describe, it, expect } from 'vitest';
import {
  calculateCost,
  estimateTokens,
  estimateCostForText,
  getModelPricing,
  getAllModelPricing,
  compareCosts,
  getCheapestModel,
  tokenCostCalculator,
} from '@/lib/ai/services/token-cost-calculator';

describe('Token Cost Calculator', () => {
  describe('calculateCost', () => {
    it('should calculate cost for GPT-4 correctly', () => {
      const cost = calculateCost('gpt-4', 1000, 500);
      // $0.03 per 1M input + $0.06 per 1M output
      // = (1000 * 0.03 / 1000000) + (500 * 0.06 / 1000000)
      // = 0.00003 + 0.00003 = 0.00006
      expect(cost).toBeCloseTo(0.00006, 8);
    });

    it('should calculate cost for GPT-3.5-turbo correctly', () => {
      const cost = calculateCost('gpt-3.5-turbo', 1000, 500);
      // $0.0015 per 1M input + $0.002 per 1M output
      expect(cost).toBeCloseTo(0.0000025, 10);
    });

    it('should calculate cost for Claude 3.5 Sonnet correctly', () => {
      const cost = calculateCost('claude-3-5-sonnet-20241022', 1000, 500);
      // $3 per 1M input + $15 per 1M output
      expect(cost).toBeCloseTo(0.0105, 6);
    });

    it('should calculate cost for Gemini 1.5 Pro correctly', () => {
      const cost = calculateCost('gemini-1.5-pro', 1000, 500);
      // $1.25 per 1M input + $5 per 1M output
      expect(cost).toBeCloseTo(0.00375, 6);
    });

    it('should return 0 for unknown models', () => {
      const cost = calculateCost('unknown-model', 1000, 500);
      expect(cost).toBe(0);
    });

    it('should handle 0 tokens', () => {
      const cost = calculateCost('gpt-4', 0, 0);
      expect(cost).toBe(0);
    });
  });

  describe('estimateTokens', () => {
    it('should estimate tokens from text (roughly 1 token per 4 chars)', () => {
      const text = 'Hello world, this is a test message!'; // 36 chars
      const tokens = estimateTokens(text);
      expect(tokens).toBeGreaterThan(0);
      expect(tokens).toBeLessThan(text.length); // Should be less than character count
      expect(tokens).toBeCloseTo(9, 0); // ~36/4 = 9
    });

    it('should handle empty text', () => {
      const tokens = estimateTokens('');
      expect(tokens).toBe(0);
    });

    it('should estimate longer text correctly', () => {
      const text = 'a'.repeat(1000); // 1000 chars
      const tokens = estimateTokens(text);
      expect(tokens).toBeCloseTo(250, 10); // ~1000/4 = 250
    });
  });

  describe('estimateCostForText', () => {
    it('should estimate cost for a text prompt and completion', () => {
      const prompt = 'What is the capital of France?';
      const expectedCompletion = 'The capital of France is Paris.';
      
      const cost = estimateCostForText('gpt-3.5-turbo', prompt, expectedCompletion);
      expect(cost).toBeGreaterThan(0);
      expect(cost).toBeLessThan(0.001); // Should be very cheap for short text
    });

    it('should use default completion tokens if not specified', () => {
      const prompt = 'Hello world';
      const cost = estimateCostForText('gpt-4', prompt);
      expect(cost).toBeGreaterThan(0);
    });
  });

  describe('getModelPricing', () => {
    it('should return pricing info for known model', () => {
      const pricing = getModelPricing('gpt-4');
      expect(pricing).toEqual({
        provider: 'openai',
        inputCostPer1M: 30,
        outputCostPer1M: 60,
      });
    });

    it('should return null for unknown model', () => {
      const pricing = getModelPricing('unknown-model');
      expect(pricing).toBeNull();
    });
  });

  describe('getAllModelPricing', () => {
    it('should return all model pricing sorted by input cost', () => {
      const allPricing = getAllModelPricing();
      
      expect(allPricing.length).toBeGreaterThan(0);
      expect(allPricing[0]).toHaveProperty('model');
      expect(allPricing[0]).toHaveProperty('provider');
      expect(allPricing[0]).toHaveProperty('inputCostPer1M');
      expect(allPricing[0]).toHaveProperty('outputCostPer1M');
      
      // Verify sorting (cheapest first)
      for (let i = 0; i < allPricing.length - 1; i++) {
        expect(allPricing[i].inputCostPer1M).toBeLessThanOrEqual(allPricing[i + 1].inputCostPer1M);
      }
    });
  });

  describe('compareCosts', () => {
    it('should compare costs across different models', () => {
      const comparison = compareCosts(
        ['gpt-4', 'gpt-3.5-turbo', 'claude-3-5-sonnet-20241022'],
        1000,
        500
      );
      
      expect(comparison).toHaveLength(3);
      
      // Verify structure
      comparison.forEach(item => {
        expect(item).toHaveProperty('model');
        expect(item).toHaveProperty('provider');
        expect(item).toHaveProperty('cost');
      });
      
      // Verify sorting (cheapest first)
      for (let i = 0; i < comparison.length - 1; i++) {
        expect(comparison[i].cost).toBeLessThanOrEqual(comparison[i + 1].cost);
      }
      
      // GPT-3.5-turbo should be cheapest
      expect(comparison[0].model).toBe('gpt-3.5-turbo');
    });

    it('should handle empty model list', () => {
      const comparison = compareCosts([], 1000, 500);
      expect(comparison).toHaveLength(0);
    });
  });

  describe('getCheapestModel', () => {
    it('should return cheapest completion model', () => {
      const result = getCheapestModel(1000, 500, 'completion');
      
      expect(result).not.toBeNull();
      expect(result?.model).toBeTruthy();
      expect(result?.cost).toBeGreaterThan(0);
      
      // GPT-3.5-turbo or Gemini Flash should be cheapest
      expect(['gpt-3.5-turbo', 'gemini-1.5-flash']).toContain(result?.model);
    });

    it('should return cheapest embedding model', () => {
      const result = getCheapestModel(1000, 0, 'embedding');
      
      expect(result).not.toBeNull();
      expect(result?.model).toContain('embedding');
      expect(result?.cost).toBeGreaterThan(0);
    });

    it('should filter embedding models for completion requests', () => {
      const result = getCheapestModel(1000, 500, 'completion');
      
      if (result) {
        expect(result.model).not.toContain('embedding');
      }
    });

    it('should filter completion models for embedding requests', () => {
      const result = getCheapestModel(1000, 0, 'embedding');
      
      if (result) {
        expect(result.model).toContain('embedding');
      }
    });
  });

  describe('tokenCostCalculator singleton', () => {
    it('should export all functions via singleton', () => {
      expect(tokenCostCalculator.calculateCost).toBe(calculateCost);
      expect(tokenCostCalculator.estimateTokens).toBe(estimateTokens);
      expect(tokenCostCalculator.estimateCostForText).toBe(estimateCostForText);
      expect(tokenCostCalculator.getModelPricing).toBe(getModelPricing);
      expect(tokenCostCalculator.getAllModelPricing).toBe(getAllModelPricing);
      expect(tokenCostCalculator.compareCosts).toBe(compareCosts);
      expect(tokenCostCalculator.getCheapestModel).toBe(getCheapestModel);
    });

    it('should calculate costs via singleton', () => {
      const cost = tokenCostCalculator.calculateCost('gpt-4', 1000, 500);
      expect(cost).toBeCloseTo(0.00006, 8);
    });
  });

  describe('Cost verification for real-world scenarios', () => {
    it('should calculate realistic cost for a chat conversation', () => {
      // Typical conversation: 200 input tokens, 150 output tokens
      const cost = calculateCost('gpt-4', 200, 150);
      
      expect(cost).toBeGreaterThan(0);
      expect(cost).toBeLessThan(0.01); // Should be less than 1 cent
      expect(cost).toBeCloseTo(0.000015, 8); // ~$0.000015
    });

    it('should show significant savings with GPT-3.5-turbo', () => {
      const tokens = { input: 1000, output: 500 };
      
      const gpt4Cost = calculateCost('gpt-4', tokens.input, tokens.output);
      const gpt35Cost = calculateCost('gpt-3.5-turbo', tokens.input, tokens.output);
      
      // GPT-3.5-turbo should be significantly cheaper
      expect(gpt35Cost).toBeLessThan(gpt4Cost * 0.1); // At least 10x cheaper
    });

    it('should calculate bulk processing costs', () => {
      // 100 requests * 1000 tokens each
      const totalInputTokens = 100000;
      const totalOutputTokens = 50000;
      
      const cost = calculateCost('gpt-3.5-turbo', totalInputTokens, totalOutputTokens);
      
      expect(cost).toBeGreaterThan(0);
      expect(cost).toBeLessThan(1); // Should be less than $1 for 100k tokens with GPT-3.5
      expect(cost).toBeCloseTo(0.25, 2); // ~$0.25
    });
  });
});
