/**
 * GraphQL API Performance Tests
 * 
 * Measures performance of GraphQL queries and mutations:
 * - Query response times
 * - Mutation execution times
 * - Concurrent request handling
 * - Complex query performance
 */

import { describe, test, expect, beforeAll } from 'vitest';
import { schema } from '@/lib/graphql/schema';
import { resolvers } from '@/lib/graphql/resolvers';
import { PensionProcessorFactory } from '@/lib/pension-processors/factory';
import { PensionPlanType } from '@/lib/pension-processors/types';
import {
  measurePerformance,
  measureConcurrentPerformance,
  formatMetrics,
  validateThresholds,
  warmup,
  type PerformanceThresholds,
} from './performance-utils';

describe('GraphQL API Performance', () => {
  beforeAll(() => {
    PensionProcessorFactory.initialize();
  });

  describe('Pension Processor Queries', () => {
    test('should query all pension processors within performance threshold', async () => {
      const queryFn = async () => {
        return resolvers.Query.pensionProcessors();
      };

      // Warmup
      await warmup(queryFn);

      // Measure performance
      const metrics = await measurePerformance(queryFn, 100);

      console.log('\nPension Processors Query:');
      console.log(formatMetrics(metrics));

      // Thresholds
      const thresholds: PerformanceThresholds = {
        avgTime: 10, // Should be very fast (in-memory)
        p95: 20,
        minThroughput: 1000, // 1000+ req/sec
      };

      const validation = validateThresholds(metrics, thresholds);
      if (!validation.passed) {
        console.warn('Performance threshold failures:', validation.failures);
      }

      expect(metrics.avgTime).toBeLessThan(thresholds.avgTime!);
      expect(metrics.p95).toBeLessThan(thresholds.p95!);
      expect(metrics.throughput).toBeGreaterThan(thresholds.minThroughput!);
    });

    test('should query single pension processor within threshold', async () => {
      const queryFn = async () => {
        return resolvers.Query.pensionProcessor(null, { planType: PensionPlanType.CPP });
      };

      await warmup(queryFn);
      const metrics = await measurePerformance(queryFn, 100);

      console.log('\nSingle Pension Processor Query:');
      console.log(formatMetrics(metrics));

      expect(metrics.avgTime).toBeLessThan(5);
      expect(metrics.p99).toBeLessThan(15);
    });

    test('should query contribution rates within threshold', async () => {
      const queryFn = async () => {
        return resolvers.Query.contributionRates(null, {
          planType: PensionPlanType.CPP,
          year: 2026,
        });
      };

      await warmup(queryFn);
      const metrics = await measurePerformance(queryFn, 100);

      console.log('\nContribution Rates Query:');
      console.log(formatMetrics(metrics));

      expect(metrics.avgTime).toBeLessThan(10);
      expect(metrics.throughput).toBeGreaterThan(500);
    });
  });

  describe('Pension Contribution Calculations', () => {
    test('should calculate CPP contribution within threshold', async () => {
      const mutationFn = async () => {
        return resolvers.Mutation.calculatePensionContribution(null, {
          input: {
            planType: PensionPlanType.CPP,
            grossEarnings: 5000,
            paymentFrequency: 'monthly',
            year: 2026,
          },
        });
      };

      await warmup(mutationFn);
      const metrics = await measurePerformance(mutationFn, 100);

      console.log('\nCPP Contribution Calculation:');
      console.log(formatMetrics(metrics));

      const thresholds: PerformanceThresholds = {
        avgTime: 15,
        p95: 30,
        minThroughput: 200,
      };

      const validation = validateThresholds(metrics, thresholds);
      expect(validation.passed).toBe(true);
    });

    test('should calculate QPP contribution within threshold', async () => {
      const mutationFn = async () => {
        return resolvers.Mutation.calculatePensionContribution(null, {
          input: {
            planType: PensionPlanType.QPP,
            grossEarnings: 2500,
            paymentFrequency: 'semimonthly',
            year: 2026,
          },
        });
      };

      await warmup(mutationFn);
      const metrics = await measurePerformance(mutationFn, 100);

      console.log('\nQPP Contribution Calculation:');
      console.log(formatMetrics(metrics));

      expect(metrics.avgTime).toBeLessThan(15);
      expect(metrics.p95).toBeLessThan(30);
    });

    test('should calculate OTPP contribution within threshold', async () => {
      const mutationFn = async () => {
        return resolvers.Mutation.calculatePensionContribution(null, {
          input: {
            planType: PensionPlanType.OTPP,
            grossEarnings: 8000,
            paymentFrequency: 'monthly',
            year: 2026,
            yearsOfService: 15,
          },
        });
      };

      await warmup(mutationFn);
      const metrics = await measurePerformance(mutationFn, 100);

      console.log('\nOTPP Contribution Calculation:');
      console.log(formatMetrics(metrics));

      expect(metrics.avgTime).toBeLessThan(20);
      expect(metrics.p95).toBeLessThan(40);
    });
  });

  describe('Concurrent Request Performance', () => {
    test('should handle concurrent pension processor queries efficiently', async () => {
      const queryFn = async () => {
        return resolvers.Query.pensionProcessors();
      };

      await warmup(queryFn);
      const metrics = await measureConcurrentPerformance(queryFn, 50);

      console.log('\nConcurrent Pension Processor Queries (50 concurrent):');
      console.log(formatMetrics(metrics));

      expect(metrics.avgTime).toBeLessThan(50);
      expect(metrics.p95).toBeLessThan(100);
    });

    test('should handle concurrent contribution calculations efficiently', async () => {
      const calculations = [
        { planType: PensionPlanType.CPP, grossEarnings: 5000 },
        { planType: PensionPlanType.QPP, grossEarnings: 4500 },
        { planType: PensionPlanType.OTPP, grossEarnings: 7000, yearsOfService: 10 },
      ];

      let index = 0;
      const mutationFn = async () => {
        const calc = calculations[index % calculations.length];
        index++;
        return resolvers.Mutation.calculatePensionContribution(null, {
          input: {
            ...calc,
            paymentFrequency: 'monthly',
            year: 2026,
          },
        });
      };

      await warmup(mutationFn, 10);
      const metrics = await measureConcurrentPerformance(mutationFn, 30);

      console.log('\nConcurrent Contribution Calculations (30 concurrent):');
      console.log(formatMetrics(metrics));

      expect(metrics.avgTime).toBeLessThan(100);
      expect(metrics.p99).toBeLessThan(200);
    });
  });

  describe('Schema Type Resolution Performance', () => {
    test('should resolve schema types quickly', async () => {
      const resolveFn = () => {
        // Check schema has all required types
        const hasTypes = [
          'PensionProcessor',
          'PensionContribution',
          'ContributionRates',
          'PensionRemittance',
          'InsuranceClaim',
          'InsurancePolicy',
        ].every(type => schema.includes(type));
        
        return hasTypes;
      };

      const metrics = await measurePerformance(resolveFn, 1000);

      console.log('\nSchema Type Resolution:');
      console.log(formatMetrics(metrics));

      expect(metrics.avgTime).toBeLessThan(1); // Should be instantaneous
      expect(metrics.throughput).toBeGreaterThan(10000);
    });
  });

  describe('Memory Usage', () => {
    test('should not leak memory during repeated queries', async () => {
      const queryFn = async () => {
        const processors = await resolvers.Query.pensionProcessors();
        const rates = await resolvers.Query.contributionRates(null, {
          planType: PensionPlanType.CPP,
          year: 2026,
        });
        return { processors, rates };
      };

      const metrics = await measurePerformance(queryFn, 1000);

      console.log('\nMemory Usage (1000 queries):');
      console.log(formatMetrics(metrics));

      // Should use less than 50MB for 1000 queries
      expect(metrics.memoryUsedMB!).toBeLessThan(50);
    });

    test('should not leak memory during repeated calculations', async () => {
      const mutationFn = async () => {
        return resolvers.Mutation.calculatePensionContribution(null, {
          input: {
            planType: PensionPlanType.CPP,
            grossEarnings: 5000 + Math.random() * 1000,
            paymentFrequency: 'monthly',
            year: 2026,
          },
        });
      };

      const metrics = await measurePerformance(mutationFn, 500);

      console.log('\nMemory Usage (500 calculations):');
      console.log(formatMetrics(metrics));

      expect(metrics.memoryUsedMB!).toBeLessThan(30);
    });
  });

  describe('Error Handling Performance', () => {
    test('should handle invalid queries efficiently', async () => {
      const invalidQueryFn = async () => {
        try {
          await resolvers.Query.pensionProcessor(null, { 
            planType: 'INVALID' as PensionPlanType 
          });
        } catch (error) {
          // Expected error
        }
      };

      const metrics = await measurePerformance(invalidQueryFn, 100);

      console.log('\nError Handling Performance:');
      console.log(formatMetrics(metrics));

      // Error handling should be fast
      expect(metrics.avgTime).toBeLessThan(5);
      expect(metrics.throughput).toBeGreaterThan(1000);
    });
  });
});
