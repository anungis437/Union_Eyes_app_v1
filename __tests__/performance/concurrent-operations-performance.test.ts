/**
 * Concurrent Operations Performance Tests
 * 
 * Measures performance under high concurrency:
 * - Multiple simultaneous GraphQL queries
 * - Concurrent database operations
 * - Parallel pension calculations
 * - Mixed workload scenarios
 * - Resource contention handling
 */

import { describe, test, expect, beforeAll } from 'vitest';
import { schema } from '@/lib/graphql/schema';
import { resolvers } from '@/lib/graphql/resolvers';
import { PensionProcessorFactory } from '@/lib/pension-processors/factory';
import { PensionPlanType, PaymentFrequency } from '@/lib/pension-processors/types';
import { db } from '@/db/database';
import { members, claims } from '@/db/schema';
import { eq } from 'drizzle-orm';
import {
  measureConcurrentPerformance,
  measureBatchedPerformance,
  formatMetrics,
  validateThresholds,
  warmup,
  type PerformanceThresholds,
} from './performance-utils';

describe('Concurrent Operations Performance', () => {
  beforeAll(() => {
    PensionProcessorFactory.initialize();
  });

  describe('High Concurrency GraphQL Operations', () => {
    test('should handle 100 concurrent pension processor queries', async () => {
      const queryFn = async () => {
        return resolvers.Query.pensionProcessors();
      };

      await warmup(queryFn);
      const metrics = await measureConcurrentPerformance(queryFn, 100);

      console.log('\n100 Concurrent Pension Processor Queries:');
      console.log(formatMetrics(metrics));

      const thresholds: PerformanceThresholds = {
        avgTime: 100,
        p95: 200,
        p99: 300,
      };

      const validation = validateThresholds(metrics, thresholds);
      expect(validation.passed).toBe(true);
    });

    test('should handle 50 concurrent contribution calculations', async () => {
      const plans = [PensionPlanType.CPP, PensionPlanType.QPP, PensionPlanType.OTPP];
      let planIndex = 0;

      const calcFn = async () => {
        const planType = plans[planIndex % plans.length];
        planIndex++;
        return resolvers.Mutation.calculatePensionContribution(null, {
          input: {
            planType,
            grossEarnings: 5000 + Math.random() * 2000,
            paymentFrequency: 'monthly',
            year: 2026,
            yearsOfService: planType === PensionPlanType.OTPP ? 15 : undefined,
          },
        });
      };

      await warmup(calcFn, 10);
      const metrics = await measureConcurrentPerformance(calcFn, 50);

      console.log('\n50 Concurrent Contribution Calculations:');
      console.log(formatMetrics(metrics));

      expect(metrics.avgTime).toBeLessThan(200);
      expect(metrics.p95).toBeLessThan(400);
    });
  });

  describe('Concurrent Database Operations', () => {
    test('should handle 50 concurrent member queries', async () => {
      const queryFn = async () => {
        const memberId = `test-member-${Math.floor(Math.random() * 100)}`;
        return db.select().from(members).where(eq(members.id, memberId)).limit(1);
      };

      await warmup(queryFn, 10);
      const metrics = await measureConcurrentPerformance(queryFn, 50);

      console.log('\n50 Concurrent Member Queries:');
      console.log(formatMetrics(metrics));

      expect(metrics.avgTime).toBeLessThan(300);
      expect(metrics.p99).toBeLessThan(600);
    });

    test('should handle 30 concurrent complex join queries', async () => {
      const queryFn = async () => {
        return db
          .select({
            claimId: claims.id,
            memberId: members.id,
          })
          .from(claims)
          .leftJoin(members, eq(claims.memberId, members.id))
          .limit(5);
      };

      await warmup(queryFn, 5);
      const metrics = await measureConcurrentPerformance(queryFn, 30);

      console.log('\n30 Concurrent Complex JOIN Queries:');
      console.log(formatMetrics(metrics));

      expect(metrics.avgTime).toBeLessThan(400);
      expect(metrics.p95).toBeLessThan(800);
    });
  });

  describe('Mixed Workload Scenarios', () => {
    test('should handle mixed GraphQL and database operations', async () => {
      let operationIndex = 0;

      const mixedFn = async () => {
        const operation = operationIndex % 4;
        operationIndex++;

        switch (operation) {
          case 0:
            // GraphQL query
            return resolvers.Query.pensionProcessors();
          case 1:
            // Pension calculation
            return resolvers.Mutation.calculatePensionContribution(null, {
              input: {
                planType: PensionPlanType.CPP,
                grossEarnings: 5000,
                paymentFrequency: 'monthly',
                year: 2026,
              },
            });
          case 2:
            // Database query
            return db.select().from(members).limit(10);
          case 3:
            // Rate lookup
            return resolvers.Query.contributionRates(null, {
              planType: PensionPlanType.QPP,
              year: 2026,
            });
          default:
            return null;
        }
      };

      const metrics = await measureConcurrentPerformance(mixedFn, 40);

      console.log('\n40 Concurrent Mixed Operations:');
      console.log(formatMetrics(metrics));

      expect(metrics.avgTime).toBeLessThan(300);
      expect(metrics.p99).toBeLessThan(600);
    });

    test('should handle burst workload pattern', async () => {
      // Simulate burst pattern: high activity, then low activity
      const burstFn = async () => {
        const processor = PensionProcessorFactory.getProcessor(PensionPlanType.CPP);
        return processor.calculateContribution({
          grossEarnings: 5000,
          paymentFrequency: PaymentFrequency.MONTHLY,
          year: 2026,
        });
      };

      // First burst
      const burst1Metrics = await measureConcurrentPerformance(burstFn, 50);
      
      // Small delay
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Second burst
      const burst2Metrics = await measureConcurrentPerformance(burstFn, 50);

      console.log('\nBurst Pattern - First Burst:');
      console.log(formatMetrics(burst1Metrics));
      console.log('\nBurst Pattern - Second Burst:');
      console.log(formatMetrics(burst2Metrics));

      // Both bursts should perform similarly
      expect(burst1Metrics.avgTime).toBeLessThan(150);
      expect(burst2Metrics.avgTime).toBeLessThan(150);
    });
  });

  describe('Batched Processing Performance', () => {
    test('should handle batched pension calculations efficiently', async () => {
      const processor = PensionProcessorFactory.getProcessor(PensionPlanType.CPP);

      const calcFn = async () => {
        return processor.calculateContribution({
          grossEarnings: 5000 + Math.random() * 1000,
          paymentFrequency: PaymentFrequency.MONTHLY,
          year: 2026,
        });
      };

      // 200 total requests, batch size 25
      const metrics = await measureBatchedPerformance(calcFn, 200, 25);

      console.log('\nBatched Processing (200 total, batch 25):');
      console.log(formatMetrics(metrics));

      const thresholds: PerformanceThresholds = {
        avgTime: 20,
        throughput: 100, // At least 100 calculations per second
      };

      const validation = validateThresholds(metrics, thresholds);
      expect(validation.passed).toBe(true);
    });

    test('should handle large batch with rate limiting', async () => {
      const queryFn = async () => {
        return resolvers.Query.contributionRates(null, {
          planType: PensionPlanType.CPP,
          year: 2026,
        });
      };

      // 500 total requests, batch size 50 (simulating rate limiting)
      const metrics = await measureBatchedPerformance(queryFn, 500, 50);

      console.log('\nLarge Batch with Rate Limiting (500 total, batch 50):');
      console.log(formatMetrics(metrics));

      expect(metrics.totalTime).toBeLessThan(30000); // Should complete in under 30 seconds
      expect(metrics.avgTime).toBeLessThan(50);
    });
  });

  describe('Resource Contention Scenarios', () => {
    test('should handle contention for pension processor factory', async () => {
      // Multiple concurrent requests for same processor
      const contendFn = async () => {
        const processor = PensionProcessorFactory.getProcessor(PensionPlanType.CPP);
        return processor.calculateContribution({
          grossEarnings: 5000,
          paymentFrequency: PaymentFrequency.MONTHLY,
          year: 2026,
        });
      };

      const metrics = await measureConcurrentPerformance(contendFn, 75);

      console.log('\n75 Concurrent Requests for Same Processor:');
      console.log(formatMetrics(metrics));

      // Factory should handle contention well
      expect(metrics.avgTime).toBeLessThan(100);
      expect(metrics.p95).toBeLessThan(200);
    });

    test('should handle contention across multiple processors', async () => {
      const plans = [PensionPlanType.CPP, PensionPlanType.QPP, PensionPlanType.OTPP];
      let planIndex = 0;

      const multiContendFn = async () => {
        const planType = plans[planIndex % plans.length];
        planIndex++;
        const processor = PensionProcessorFactory.getProcessor(planType);
        return processor.calculateContribution({
          grossEarnings: 5000,
          paymentFrequency: PaymentFrequency.MONTHLY,
          year: 2026,
          yearsOfService: planType === PensionPlanType.OTPP ? 15 : undefined,
        });
      };

      const metrics = await measureConcurrentPerformance(multiContendFn, 60);

      console.log('\n60 Concurrent Requests Across Multiple Processors:');
      console.log(formatMetrics(metrics));

      expect(metrics.avgTime).toBeLessThan(150);
    });
  });

  describe('Scaling Characteristics', () => {
    test('should measure performance scaling with increasing concurrency', async () => {
      const processor = PensionProcessorFactory.getProcessor(PensionPlanType.CPP);

      const calcFn = async () => {
        return processor.calculateContribution({
          grossEarnings: 5000,
          paymentFrequency: PaymentFrequency.MONTHLY,
          year: 2026,
        });
      };

      // Test with different concurrency levels
      const concurrencyLevels = [10, 25, 50, 100];
      const results = [];

      for (const level of concurrencyLevels) {
        const metrics = await measureConcurrentPerformance(calcFn, level);
        results.push({ level, metrics });
      }

      console.log('\n=== Scaling Characteristics ===');
      results.forEach(({ level, metrics }) => {
        console.log(`\nConcurrency Level: ${level}`);
        console.log(`  Avg: ${metrics.avgTime.toFixed(2)}ms`);
        console.log(`  P95: ${metrics.p95.toFixed(2)}ms`);
        console.log(`  Throughput: ${metrics.throughput.toFixed(2)} req/sec`);
      });

      // Performance should scale reasonably
      results.forEach(({ metrics }) => {
        expect(metrics.avgTime).toBeLessThan(200);
      });
    });

    test('should compare sequential vs concurrent execution', async () => {
      const processor = PensionProcessorFactory.getProcessor(PensionPlanType.CPP);

      const calcFn = async () => {
        return processor.calculateContribution({
          grossEarnings: 5000,
          paymentFrequency: PaymentFrequency.MONTHLY,
          year: 2026,
        });
      };

      // Sequential execution
      const sequentialStart = performance.now();
      for (let i = 0; i < 50; i++) {
        await calcFn();
      }
      const sequentialTime = performance.now() - sequentialStart;

      // Concurrent execution
      const concurrentMetrics = await measureConcurrentPerformance(calcFn, 50);

      console.log('\n=== Sequential vs Concurrent Comparison ===');
      console.log(`Sequential (50 operations): ${sequentialTime.toFixed(2)}ms`);
      console.log(`Concurrent (50 operations): ${concurrentMetrics.totalTime.toFixed(2)}ms`);
      console.log(`Speedup: ${(sequentialTime / concurrentMetrics.totalTime).toFixed(2)}x`);

      // Concurrent should be faster
      expect(concurrentMetrics.totalTime).toBeLessThan(sequentialTime);
    });
  });

  describe('Memory Under Concurrency', () => {
    test('should not leak memory under concurrent load', async () => {
      const queryFn = async () => {
        const processors = await resolvers.Query.pensionProcessors();
        const calculation = await resolvers.Mutation.calculatePensionContribution(null, {
          input: {
            planType: PensionPlanType.CPP,
            grossEarnings: 5000,
            paymentFrequency: 'monthly',
            year: 2026,
          },
        });
        return { processors, calculation };
      };

      const metrics = await measureConcurrentPerformance(queryFn, 50);

      console.log('\nMemory Usage (50 concurrent complex operations):');
      console.log(formatMetrics(metrics));

      // Should use reasonable memory even under load
      expect(metrics.memoryUsedMB!).toBeLessThan(100);
    });
  });

  describe('Error Recovery Under Load', () => {
    test('should handle errors gracefully under concurrent load', async () => {
      let errorCount = 0;
      let successCount = 0;

      const mixedFn = async () => {
        // 20% error rate
        if (Math.random() < 0.2) {
          try {
            await resolvers.Query.pensionProcessor(null, {
              planType: 'INVALID' as PensionPlanType,
            });
          } catch {
            errorCount++;
            throw new Error('Expected error');
          }
        } else {
          successCount++;
          return resolvers.Query.pensionProcessors();
        }
      };

      try {
        await measureConcurrentPerformance(mixedFn, 50);
      } catch {
        // Some errors expected
      }

      console.log(`\nError Recovery: ${successCount} successes, ${errorCount} errors`);

      // Should handle mix of success and errors
      expect(successCount).toBeGreaterThan(0);
      expect(errorCount).toBeGreaterThan(0);
    });
  });

  describe('Peak Load Testing', () => {
    test('should handle peak load of 200 concurrent operations', async () => {
      const operations = [
        () => resolvers.Query.pensionProcessors(),
        () => resolvers.Query.contributionRates(null, { planType: PensionPlanType.CPP, year: 2026 }),
        () => resolvers.Mutation.calculatePensionContribution(null, {
          input: {
            planType: PensionPlanType.QPP,
            grossEarnings: 5000,
            paymentFrequency: 'monthly',
            year: 2026,
          },
        }),
      ];

      let opIndex = 0;
      const peakFn = async () => {
        const operation = operations[opIndex % operations.length];
        opIndex++;
        return operation();
      };

      const metrics = await measureConcurrentPerformance(peakFn, 200);

      console.log('\n200 Concurrent Peak Load:');
      console.log(formatMetrics(metrics));

      // System should remain responsive even under peak load
      expect(metrics.avgTime).toBeLessThan(500);
      expect(metrics.p99).toBeLessThan(1000);
    });
  });
});
