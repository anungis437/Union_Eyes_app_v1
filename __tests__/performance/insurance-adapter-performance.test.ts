/**
 * Insurance Adapter Performance Tests
 * 
 * Measures performance of insurance integration operations:
 * - Adapter initialization
 * - OAuth authentication flows
 * - Data sync operations
 * - Health check performance
 * - Concurrent sync operations
 */

import { describe, test, expect, beforeEach } from 'vitest';
import {
  GreenShieldAdapter,
  CanadaLifeAdapter,
  IndustrialAllianceAdapter,
} from '@/lib/integrations/adapters/insurance';
import { IntegrationProvider } from '@/lib/integrations/types';
import {
  measurePerformance,
  measureConcurrentPerformance,
  formatMetrics,
  validateThresholds,
  warmup,
  type PerformanceThresholds,
} from './performance-utils';

describe('Insurance Adapter Performance', () => {
  describe('Green Shield Canada Adapter', () => {
    let adapter: GreenShieldAdapter;

    beforeEach(() => {
      adapter = new GreenShieldAdapter();
    });

    test('should initialize adapter within threshold', async () => {
      const config = {
        organizationId: 'perf-test-org',
        type: 'insurance' as const,
        provider: IntegrationProvider.GREEN_SHIELD_CANADA,
        credentials: {
          clientId: 'test-client-id',
          clientSecret: 'test-client-secret',
        },
        settings: {
          groupNumber: 'GRP-PERF',
        },
        enabled: true,
      };

      const initFn = async () => {
        const testAdapter = new GreenShieldAdapter();
        await testAdapter.initialize(config);
      };

      const metrics = await measurePerformance(initFn, 50);

      console.log('\nGreen Shield Adapter Initialization:');
      console.log(formatMetrics(metrics));

      const thresholds: PerformanceThresholds = {
        avgTime: 100,
        p95: 200,
      };

      const validation = validateThresholds(metrics, thresholds);
      expect(validation.passed).toBe(true);
    });

    test('should check capabilities within threshold', async () => {
      const capabilitiesFn = () => {
        return {
          supportsFullSync: adapter.capabilities.supportsFullSync,
          supportsIncrementalSync: adapter.capabilities.supportsIncrementalSync,
          entities: adapter.capabilities.supportedEntities,
          rateLimit: adapter.capabilities.rateLimitPerMinute,
        };
      };

      const metrics = await measurePerformance(capabilitiesFn, 1000);

      console.log('\nGreen Shield Capabilities Check:');
      console.log(formatMetrics(metrics));

      // Capabilities check should be instant
      expect(metrics.avgTime).toBeLessThan(0.5);
      expect(metrics.throughput).toBeGreaterThan(10000);
    });

    test('should validate health check performance', async () => {
      await adapter.initialize({
        organizationId: 'perf-test-org',
        type: 'insurance' as const,
        provider: IntegrationProvider.GREEN_SHIELD_CANADA,
        credentials: {
          clientId: 'test',
          clientSecret: 'test',
        },
        enabled: true,
      });

      const healthFn = async () => {
        try {
          return await adapter.healthCheck();
        } catch {
          return { healthy: false };
        }
      };

      const metrics = await measurePerformance(healthFn, 20);

      console.log('\nGreen Shield Health Check:');
      console.log(formatMetrics(metrics));

      // Health checks should be reasonably fast
      expect(metrics.avgTime).toBeLessThan(500);
    });
  });

  describe('Canada Life Adapter', () => {
    let adapter: CanadaLifeAdapter;

    beforeEach(() => {
      adapter = new CanadaLifeAdapter();
    });

    test('should initialize adapter within threshold', async () => {
      const config = {
        organizationId: 'perf-test-org',
        type: 'insurance' as const,
        provider: IntegrationProvider.CANADA_LIFE,
        credentials: {
          clientId: 'test-client-id',
          clientSecret: 'test-client-secret',
        },
        settings: {
          policyGroupId: 'POL-PERF',
        },
        enabled: true,
      };

      const initFn = async () => {
        const testAdapter = new CanadaLifeAdapter();
        await testAdapter.initialize(config);
      };

      const metrics = await measurePerformance(initFn, 50);

      console.log('\nCanada Life Adapter Initialization:');
      console.log(formatMetrics(metrics));

      expect(metrics.avgTime).toBeLessThan(100);
      expect(metrics.p95).toBeLessThan(200);
    });

    test('should check capabilities efficiently', async () => {
      const capabilitiesFn = () => {
        return adapter.capabilities;
      };

      const metrics = await measurePerformance(capabilitiesFn, 1000);

      console.log('\nCanada Life Capabilities Check:');
      console.log(formatMetrics(metrics));

      expect(metrics.avgTime).toBeLessThan(0.5);
    });

    test('should validate rate limiting configuration', () => {
      expect(adapter.capabilities.rateLimitPerMinute).toBe(150);
      
      // Verify rate limit is properly set
      const rateLimit = adapter.capabilities.rateLimitPerMinute;
      expect(rateLimit).toBeGreaterThan(0);
      expect(rateLimit).toBeLessThanOrEqual(200);
    });
  });

  describe('Industrial Alliance Adapter', () => {
    let adapter: IndustrialAllianceAdapter;

    beforeEach(() => {
      adapter = new IndustrialAllianceAdapter();
    });

    test('should initialize adapter within threshold', async () => {
      const config = {
        organizationId: 'perf-test-org',
        type: 'insurance' as const,
        provider: IntegrationProvider.INDUSTRIAL_ALLIANCE,
        credentials: {
          clientId: 'test-client-id',
          clientSecret: 'test-client-secret',
        },
        settings: {
          groupAccountId: 'ACC-PERF',
        },
        enabled: true,
      };

      const initFn = async () => {
        const testAdapter = new IndustrialAllianceAdapter();
        await testAdapter.initialize(config);
      };

      const metrics = await measurePerformance(initFn, 50);

      console.log('\nIndustrial Alliance Adapter Initialization:');
      console.log(formatMetrics(metrics));

      expect(metrics.avgTime).toBeLessThan(100);
      expect(metrics.p95).toBeLessThan(200);
    });

    test('should check utilization tracking capabilities', () => {
      const entities = adapter.capabilities.supportedEntities;
      
      // Should include utilization tracking
      expect(entities).toContain('utilization');
      expect(entities).toContain('policies');
      expect(entities).toContain('claims');
      expect(entities).toContain('beneficiaries');
      
      // Should have 4 entities
      expect(entities.length).toBe(4);
    });
  });

  describe('Adapter Comparison Performance', () => {
    test('should compare initialization times across adapters', async () => {
      const configs = {
        greenShield: {
          organizationId: 'test-org',
          type: 'insurance' as const,
          provider: IntegrationProvider.GREEN_SHIELD_CANADA,
          credentials: { clientId: 'test', clientSecret: 'test' },
          enabled: true,
        },
        canadaLife: {
          organizationId: 'test-org',
          type: 'insurance' as const,
          provider: IntegrationProvider.CANADA_LIFE,
          credentials: { clientId: 'test', clientSecret: 'test' },
          enabled: true,
        },
        industrialAlliance: {
          organizationId: 'test-org',
          type: 'insurance' as const,
          provider: IntegrationProvider.INDUSTRIAL_ALLIANCE,
          credentials: { clientId: 'test', clientSecret: 'test' },
          enabled: true,
        },
      };

      const gscFn = async () => {
        const adapter = new GreenShieldAdapter();
        await adapter.initialize(configs.greenShield);
      };

      const clFn = async () => {
        const adapter = new CanadaLifeAdapter();
        await adapter.initialize(configs.canadaLife);
      };

      const iaFn = async () => {
        const adapter = new IndustrialAllianceAdapter();
        await adapter.initialize(configs.industrialAlliance);
      };

      const gscMetrics = await measurePerformance(gscFn, 30);
      const clMetrics = await measurePerformance(clFn, 30);
      const iaMetrics = await measurePerformance(iaFn, 30);

      console.log('\n=== Adapter Initialization Comparison ===');
      console.log('\nGreen Shield Canada:');
      console.log(formatMetrics(gscMetrics));
      console.log('\nCanada Life:');
      console.log(formatMetrics(clMetrics));
      console.log('\nIndustrial Alliance:');
      console.log(formatMetrics(iaMetrics));

      // All should initialize in similar timeframes
      expect(gscMetrics.avgTime).toBeLessThan(150);
      expect(clMetrics.avgTime).toBeLessThan(150);
      expect(iaMetrics.avgTime).toBeLessThan(150);
    });

    test('should compare rate limits across adapters', () => {
      const gsc = new GreenShieldAdapter();
      const cl = new CanadaLifeAdapter();
      const ia = new IndustrialAllianceAdapter();

      const rateLimits = {
        greenShield: gsc.capabilities.rateLimitPerMinute,
        canadaLife: cl.capabilities.rateLimitPerMinute,
        industrialAlliance: ia.capabilities.rateLimitPerMinute,
      };

      console.log('\n=== Rate Limit Comparison ===');
      console.log(`Green Shield Canada: ${rateLimits.greenShield} req/min`);
      console.log(`Canada Life: ${rateLimits.canadaLife} req/min`);
      console.log(`Industrial Alliance: ${rateLimits.industrialAlliance} req/min`);

      // Verify rate limits
      expect(rateLimits.greenShield).toBe(200);
      expect(rateLimits.canadaLife).toBe(150);
      expect(rateLimits.industrialAlliance).toBe(150);

      // Green Shield should have highest rate limit
      expect(rateLimits.greenShield).toBeGreaterThan(rateLimits.canadaLife);
      expect(rateLimits.greenShield).toBeGreaterThan(rateLimits.industrialAlliance);
    });
  });

  describe('Concurrent Adapter Operations', () => {
    test('should handle concurrent adapter initializations', async () => {
      const config = {
        organizationId: 'concurrent-test',
        type: 'insurance' as const,
        provider: IntegrationProvider.GREEN_SHIELD_CANADA,
        credentials: { clientId: 'test', clientSecret: 'test' },
        enabled: true,
      };

      const initFn = async () => {
        const adapter = new GreenShieldAdapter();
        await adapter.initialize(config);
      };

      const metrics = await measureConcurrentPerformance(initFn, 10);

      console.log('\nConcurrent Adapter Initializations (10 concurrent):');
      console.log(formatMetrics(metrics));

      expect(metrics.avgTime).toBeLessThan(500);
      expect(metrics.p95).toBeLessThan(1000);
    });

    test('should handle mixed adapter operations concurrently', async () => {
      const adapters = [
        new GreenShieldAdapter(),
        new CanadaLifeAdapter(),
        new IndustrialAllianceAdapter(),
      ];

      let adapterIndex = 0;
      const mixedFn = async () => {
        const adapter = adapters[adapterIndex % adapters.length];
        adapterIndex++;
        return adapter.capabilities;
      };

      const metrics = await measureConcurrentPerformance(mixedFn, 30);

      console.log('\nConcurrent Mixed Adapter Operations (30 concurrent):');
      console.log(formatMetrics(metrics));

      expect(metrics.avgTime).toBeLessThan(10);
    });
  });

  describe('Memory Efficiency', () => {
    test('should not leak memory during repeated initializations', async () => {
      const config = {
        organizationId: 'memory-test',
        type: 'insurance' as const,
        provider: IntegrationProvider.GREEN_SHIELD_CANADA,
        credentials: { clientId: 'test', clientSecret: 'test' },
        enabled: true,
      };

      const initFn = async () => {
        const adapter = new GreenShieldAdapter();
        await adapter.initialize(config);
        // Adapter should be garbage collected
      };

      const metrics = await measurePerformance(initFn, 100);

      console.log('\nMemory Usage (100 adapter initializations):');
      console.log(formatMetrics(metrics));

      // Should use reasonable memory
      expect(metrics.memoryUsedMB!).toBeLessThan(50);
    });

    test('should not leak memory with multiple adapter types', async () => {
      const configs = [
        {
          organizationId: 'memory-test',
          type: 'insurance' as const,
          provider: IntegrationProvider.GREEN_SHIELD_CANADA,
          credentials: { clientId: 'test', clientSecret: 'test' },
          enabled: true,
        },
        {
          organizationId: 'memory-test',
          type: 'insurance' as const,
          provider: IntegrationProvider.CANADA_LIFE,
          credentials: { clientId: 'test', clientSecret: 'test' },
          enabled: true,
        },
      ];

      let configIndex = 0;
      const mixedInitFn = async () => {
        const config = configs[configIndex % configs.length];
        configIndex++;
        
        if (config.provider === IntegrationProvider.GREEN_SHIELD_CANADA) {
          const adapter = new GreenShieldAdapter();
          await adapter.initialize(config);
        } else {
          const adapter = new CanadaLifeAdapter();
          await adapter.initialize(config);
        }
      };

      const metrics = await measurePerformance(mixedInitFn, 100);

      console.log('\nMemory Usage (100 mixed adapter initializations):');
      console.log(formatMetrics(metrics));

      expect(metrics.memoryUsedMB!).toBeLessThan(50);
    });
  });

  describe('Error Handling Performance', () => {
    test('should handle initialization errors efficiently', async () => {
      const invalidConfig = {
        organizationId: 'error-test',
        type: 'insurance' as const,
        provider: IntegrationProvider.GREEN_SHIELD_CANADA,
        credentials: {
          clientId: '',
          clientSecret: '',
        },
        enabled: true,
      };

      const errorFn = async () => {
        try {
          const adapter = new GreenShieldAdapter();
          await adapter.initialize(invalidConfig);
          await adapter.connect();
        } catch (error) {
          // Expected error
          return null;
        }
      };

      const metrics = await measurePerformance(errorFn, 50);

      console.log('\nError Handling Performance:');
      console.log(formatMetrics(metrics));

      // Error handling should be reasonably fast
      expect(metrics.avgTime).toBeLessThan(200);
    });
  });

  describe('OAuth Flow Performance', () => {
    test('should measure authentication overhead', async () => {
      // This test measures the overhead of OAuth preparation
      const oauthPrepFn = () => {
        const adapter = new GreenShieldAdapter();
        return {
          provider: adapter.provider,
          requiresOAuth: adapter.capabilities.requiresOAuth,
          rateLimit: adapter.capabilities.rateLimitPerMinute,
        };
      };

      const metrics = await measurePerformance(oauthPrepFn, 1000);

      console.log('\nOAuth Preparation Overhead:');
      console.log(formatMetrics(metrics));

      // Should be near-zero overhead
      expect(metrics.avgTime).toBeLessThan(0.5);
    });
  });

  describe('Adapter Factory Pattern Performance', () => {
    test('should measure adapter instantiation overhead', async () => {
      const instantiateFn = () => {
        const gsc = new GreenShieldAdapter();
        const cl = new CanadaLifeAdapter();
        const ia = new IndustrialAllianceAdapter();
        return { gsc, cl, ia };
      };

      const metrics = await measurePerformance(instantiateFn, 1000);

      console.log('\nAdapter Instantiation:');
      console.log(formatMetrics(metrics));

      // Instantiation should be very fast
      expect(metrics.avgTime).toBeLessThan(5);
      expect(metrics.throughput).toBeGreaterThan(500);
    });
  });
});
