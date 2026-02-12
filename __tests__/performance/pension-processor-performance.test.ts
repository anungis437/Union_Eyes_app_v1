/**
 * Pension Processor Performance Tests
 * 
 * Measures performance of pension calculation operations:
 * - Contribution calculations
 * - Rate lookups
 * - Remittance processing
 * - Concurrent calculations
 */

import { describe, test, expect, beforeAll } from 'vitest';
import { PensionProcessorFactory } from '@/lib/pension-processors/factory';
import { PensionPlanType, PaymentFrequency } from '@/lib/pension-processors/types';
import {
  measurePerformance,
  measureConcurrentPerformance,
  measureBatchedPerformance,
  formatMetrics,
  validateThresholds,
  warmup,
  type PerformanceThresholds,
} from './performance-utils';

describe('Pension Processor Performance', () => {
  beforeAll(() => {
    PensionProcessorFactory.initialize();
  });

  describe('CPP Processor', () => {
    test('should calculate CPP contribution within threshold', async () => {
      const processor = PensionProcessorFactory.getProcessor(PensionPlanType.CPP);

      const calcFn = async () => {
        return processor.calculateContribution({
          grossEarnings: 5000,
          paymentFrequency: PaymentFrequency.MONTHLY,
          year: 2026,
        });
      };

      await warmup(calcFn);
      const metrics = await measurePerformance(calcFn, 1000);

      console.log('\nCPP Contribution Calculation:');
      console.log(formatMetrics(metrics));

      const thresholds: PerformanceThresholds = {
        avgTime: 5,
        p95: 10,
        p99: 15,
        minThroughput: 500,
      };

      const validation = validateThresholds(metrics, thresholds);
      expect(validation.passed).toBe(true);
    });

    test('should get CPP rates within threshold', async () => {
      const processor = PensionProcessorFactory.getProcessor(PensionPlanType.CPP);

      const rateFn = async () => {
        return processor.getContributionRates(2026);
      };

      await warmup(rateFn);
      const metrics = await measurePerformance(rateFn, 1000);

      console.log('\nCPP Rate Lookup:');
      console.log(formatMetrics(metrics));

      // Rate lookup should be extremely fast (cached)
      expect(metrics.avgTime).toBeLessThan(1);
      expect(metrics.throughput).toBeGreaterThan(5000);
    });

    test('should handle various payment frequencies efficiently', async () => {
      const processor = PensionProcessorFactory.getProcessor(PensionPlanType.CPP);
      const frequencies = [
        PaymentFrequency.WEEKLY,
        PaymentFrequency.BIWEEKLY,
        PaymentFrequency.SEMIMONTHLY,
        PaymentFrequency.MONTHLY,
      ];

      let freqIndex = 0;
      const calcFn = async () => {
        const freq = frequencies[freqIndex % frequencies.length];
        freqIndex++;
        return processor.calculateContribution({
          grossEarnings: 5000,
          paymentFrequency: freq,
          year: 2026,
        });
      };

      const metrics = await measurePerformance(calcFn, 400);

      console.log('\nCPP Multi-Frequency Calculations:');
      console.log(formatMetrics(metrics));

      expect(metrics.avgTime).toBeLessThan(10);
      expect(metrics.p95).toBeLessThan(20);
    });
  });

  describe('QPP Processor', () => {
    test('should calculate QPP contribution within threshold', async () => {
      const processor = PensionProcessorFactory.getProcessor(PensionPlanType.QPP);

      const calcFn = async () => {
        return processor.calculateContribution({
          grossEarnings: 4500,
          paymentFrequency: PaymentFrequency.SEMIMONTHLY,
          year: 2026,
        });
      };

      await warmup(calcFn);
      const metrics = await measurePerformance(calcFn, 1000);

      console.log('\nQPP Contribution Calculation:');
      console.log(formatMetrics(metrics));

      expect(metrics.avgTime).toBeLessThan(5);
      expect(metrics.p99).toBeLessThan(15);
      expect(metrics.throughput).toBeGreaterThan(500);
    });

    test('should get QPP rates within threshold', async () => {
      const processor = PensionProcessorFactory.getProcessor(PensionPlanType.QPP);

      const rateFn = async () => {
        return processor.getContributionRates(2026);
      };

      const metrics = await measurePerformance(rateFn, 1000);

      console.log('\nQPP Rate Lookup:');
      console.log(formatMetrics(metrics));

      expect(metrics.avgTime).toBeLessThan(1);
    });
  });

  describe('OTPP Processor', () => {
    test('should calculate OTPP contribution within threshold', async () => {
      const processor = PensionProcessorFactory.getProcessor(PensionPlanType.OTPP);

      const calcFn = async () => {
        return processor.calculateContribution({
          grossEarnings: 8000,
          paymentFrequency: PaymentFrequency.MONTHLY,
          year: 2026,
          yearsOfService: 15,
        });
      };

      await warmup(calcFn);
      const metrics = await measurePerformance(calcFn, 1000);

      console.log('\nOTPP Contribution Calculation:');
      console.log(formatMetrics(metrics));

      const thresholds: PerformanceThresholds = {
        avgTime: 10,
        p95: 20,
        minThroughput: 300,
      };

      const validation = validateThresholds(metrics, thresholds);
      expect(validation.passed).toBe(true);
    });

    test('should handle tiered rate calculations efficiently', async () => {
      const processor = PensionProcessorFactory.getProcessor(PensionPlanType.OTPP);

      const calcFn = async () => {
        // Use earnings that cross tier boundaries
        const earnings = 6000 + Math.random() * 4000; // $6k-$10k range
        return processor.calculateContribution({
          grossEarnings: earnings,
          paymentFrequency: PaymentFrequency.MONTHLY,
          year: 2026,
          yearsOfService: 20,
        });
      };

      const metrics = await measurePerformance(calcFn, 500);

      console.log('\nOTPP Tiered Rate Calculations:');
      console.log(formatMetrics(metrics));

      expect(metrics.avgTime).toBeLessThan(15);
      expect(metrics.p95).toBeLessThan(30);
    });
  });

  describe('Factory Performance', () => {
    test('should retrieve processors from factory efficiently', async () => {
      const getFn = () => {
        const cpp = PensionProcessorFactory.getProcessor(PensionPlanType.CPP);
        const qpp = PensionProcessorFactory.getProcessor(PensionPlanType.QPP);
        const otpp = PensionProcessorFactory.getProcessor(PensionPlanType.OTPP);
        return { cpp, qpp, otpp };
      };

      const metrics = await measurePerformance(getFn, 1000);

      console.log('\nFactory Processor Retrieval:');
      console.log(formatMetrics(metrics));

      // Factory lookups should be instant (cached)
      expect(metrics.avgTime).toBeLessThan(0.5);
      expect(metrics.throughput).toBeGreaterThan(10000);
    });

    test('should list all processors efficiently', async () => {
      const listFn = () => {
        return PensionProcessorFactory.getAllProcessors();
      };

      const metrics = await measurePerformance(listFn, 1000);

      console.log('\nFactory List All Processors:');
      console.log(formatMetrics(metrics));

      expect(metrics.avgTime).toBeLessThan(1);
    });
  });

  describe('Concurrent Calculations', () => {
    test('should handle concurrent CPP calculations efficiently', async () => {
      const processor = PensionProcessorFactory.getProcessor(PensionPlanType.CPP);

      const calcFn = async () => {
        return processor.calculateContribution({
          grossEarnings: 5000 + Math.random() * 2000,
          paymentFrequency: PaymentFrequency.MONTHLY,
          year: 2026,
        });
      };

      await warmup(calcFn, 10);
      const metrics = await measureConcurrentPerformance(calcFn, 100);

      console.log('\nConcurrent CPP Calculations (100 concurrent):');
      console.log(formatMetrics(metrics));

      expect(metrics.avgTime).toBeLessThan(50);
      expect(metrics.p95).toBeLessThan(100);
    });

    test('should handle mixed processor calculations concurrently', async () => {
      const plans = [
        PensionPlanType.CPP,
        PensionPlanType.QPP,
        PensionPlanType.OTPP,
      ];

      let planIndex = 0;
      const calcFn = async () => {
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

      await warmup(calcFn, 10);
      const metrics = await measureConcurrentPerformance(calcFn, 90);

      console.log('\nConcurrent Mixed Processor Calculations (90 concurrent):');
      console.log(formatMetrics(metrics));

      expect(metrics.avgTime).toBeLessThan(75);
      expect(metrics.p99).toBeLessThan(150);
    });
  });

  describe('Batch Processing', () => {
    test('should process batches of CPP calculations efficiently', async () => {
      const processor = PensionProcessorFactory.getProcessor(PensionPlanType.CPP);

      const calcFn = async () => {
        return processor.calculateContribution({
          grossEarnings: 5000,
          paymentFrequency: PaymentFrequency.MONTHLY,
          year: 2026,
        });
      };

      const metrics = await measureBatchedPerformance(calcFn, 500, 50);

      console.log('\nBatched CPP Calculations (500 total, batch size 50):');
      console.log(formatMetrics(metrics));

      expect(metrics.avgTime).toBeLessThan(10);
      expect(metrics.throughput).toBeGreaterThan(200);
    });

    test('should process large batch of OTPP calculations efficiently', async () => {
      const processor = PensionProcessorFactory.getProcessor(PensionPlanType.OTPP);

      const calcFn = async () => {
        return processor.calculateContribution({
          grossEarnings: 7000 + Math.random() * 2000,
          paymentFrequency: PaymentFrequency.MONTHLY,
          year: 2026,
          yearsOfService: Math.floor(Math.random() * 30) + 1,
        });
      };

      const metrics = await measureBatchedPerformance(calcFn, 300, 30);

      console.log('\nBatched OTPP Calculations (300 total, batch size 30):');
      console.log(formatMetrics(metrics));

      expect(metrics.avgTime).toBeLessThan(20);
    });
  });

  describe('Memory Efficiency', () => {
    test('should not leak memory during repeated calculations', async () => {
      const processor = PensionProcessorFactory.getProcessor(PensionPlanType.CPP);

      const calcFn = async () => {
        const results = [];
        for (let i = 0; i < 10; i++) {
          results.push(
            processor.calculateContribution({
              grossEarnings: 5000 + i * 100,
              paymentFrequency: PaymentFrequency.MONTHLY,
              year: 2026,
            })
          );
        }
        return results;
      };

      const metrics = await measurePerformance(calcFn, 100);

      console.log('\nMemory Usage (1000 calculations):');
      console.log(formatMetrics(metrics));

      // Should use minimal memory
      expect(metrics.memoryUsedMB!).toBeLessThan(10);
    });
  });

  describe('Edge Cases', () => {
    test('should handle minimum earnings efficiently', async () => {
      const processor = PensionProcessorFactory.getProcessor(PensionPlanType.CPP);

      const calcFn = async () => {
        return processor.calculateContribution({
          grossEarnings: 100,
          paymentFrequency: PaymentFrequency.WEEKLY,
          year: 2026,
        });
      };

      const metrics = await measurePerformance(calcFn, 500);

      console.log('\nMinimum Earnings Calculations:');
      console.log(formatMetrics(metrics));

      expect(metrics.avgTime).toBeLessThan(5);
    });

    test('should handle maximum earnings efficiently', async () => {
      const processor = PensionProcessorFactory.getProcessor(PensionPlanType.CPP);

      const calcFn = async () => {
        return processor.calculateContribution({
          grossEarnings: 25000,
          paymentFrequency: PaymentFrequency.MONTHLY,
          year: 2026,
        });
      };

      const metrics = await measurePerformance(calcFn, 500);

      console.log('\nMaximum Earnings Calculations:');
      console.log(formatMetrics(metrics));

      expect(metrics.avgTime).toBeLessThan(5);
    });
  });
});
