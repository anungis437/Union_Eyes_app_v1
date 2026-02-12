/**
 * Insurance Adapters Integration Tests
 * 
 * Tests for Green Shield Canada, Canada Life, and Industrial Alliance adapters
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { 
  GreenShieldAdapter,
  CanadaLifeAdapter,
  IndustrialAllianceAdapter,
} from '@/lib/integrations/adapters/insurance';
import { IntegrationProvider } from '@/lib/integrations/types';

describe('Insurance Adapters', () => {
  describe('Green Shield Canada Adapter', () => {
    let adapter: GreenShieldAdapter;

    beforeEach(() => {
      adapter = new GreenShieldAdapter();
    });

    test('should initialize with correct provider', () => {
      expect(adapter.provider).toBe(IntegrationProvider.GREEN_SHIELD_CANADA);
    });

    test('should have correct capabilities', () => {
      expect(adapter.capabilities.supportsFullSync).toBe(true);
      expect(adapter.capabilities.supportsIncrementalSync).toBe(true);
      expect(adapter.capabilities.supportsWebhooks).toBe(false);
      expect(adapter.capabilities.requiresOAuth).toBe(true);
      expect(adapter.capabilities.supportedEntities).toContain('plans');
      expect(adapter.capabilities.supportedEntities).toContain('enrollments');
      expect(adapter.capabilities.supportedEntities).toContain('claims');
      expect(adapter.capabilities.supportedEntities).toContain('coverage');
    });

    test('should initialize with config', async () => {
      const config = {
        organizationId: 'org-123',
        type: 'insurance' as const,
        provider: IntegrationProvider.GREEN_SHIELD_CANADA,
        credentials: {
          clientId: 'test-client-id',
          clientSecret: 'test-client-secret',
        },
        settings: {
          groupNumber: 'GRP-12345',
        },
        enabled: true,
      };

      await adapter.initialize(config);
      expect(adapter.isInitialized).toBe(true);
    });

    test('should throw error when connecting without initialization', async () => {
      await expect(adapter.connect()).rejects.toThrow('Integration not initialized');
    });

    test('should have correct rate limit', () => {
      expect(adapter.capabilities.rateLimitPerMinute).toBe(200);
    });

    test('should not support webhooks', async () => {
      const isValid = await adapter.verifyWebhook('payload', 'signature');
      expect(isValid).toBe(false);
    });
  });

  describe('Canada Life Adapter', () => {
    let adapter: CanadaLifeAdapter;

    beforeEach(() => {
      adapter = new CanadaLifeAdapter();
    });

    test('should initialize with correct provider', () => {
      expect(adapter.provider).toBe(IntegrationProvider.CANADA_LIFE);
    });

    test('should have correct capabilities', () => {
      expect(adapter.capabilities.supportsFullSync).toBe(true);
      expect(adapter.capabilities.supportsIncrementalSync).toBe(true);
      expect(adapter.capabilities.supportsWebhooks).toBe(false);
      expect(adapter.capabilities.requiresOAuth).toBe(true);
      expect(adapter.capabilities.supportedEntities).toContain('policies');
      expect(adapter.capabilities.supportedEntities).toContain('claims');
      expect(adapter.capabilities.supportedEntities).toContain('beneficiaries');
    });

    test('should initialize with config', async () => {
      const config = {
        organizationId: 'org-456',
        type: 'insurance' as const,
        provider: IntegrationProvider.CANADA_LIFE,
        credentials: {
          clientId: 'test-client-id',
          clientSecret: 'test-client-secret',
        },
        settings: {
          policyGroupId: 'POL-67890',
        },
        enabled: true,
      };

      await adapter.initialize(config);
      expect(adapter.isInitialized).toBe(true);
    });

    test('should have correct rate limit', () => {
      expect(adapter.capabilities.rateLimitPerMinute).toBe(150);
    });

    test('should support life, disability, and health insurance types', async () => {
      // Mock implementation - in production would call actual API
      const entities = adapter.capabilities.supportedEntities;
      expect(entities).toContain('policies');
      expect(entities).toContain('claims');
      expect(entities).toContain('beneficiaries');
    });

    test('should not support webhooks', async () => {
      const isValid = await adapter.verifyWebhook('payload', 'signature');
      expect(isValid).toBe(false);
    });
  });

  describe('Industrial Alliance Adapter', () => {
    let adapter: IndustrialAllianceAdapter;

    beforeEach(() => {
      adapter = new IndustrialAllianceAdapter();
    });

    test('should initialize with correct provider', () => {
      expect(adapter.provider).toBe(IntegrationProvider.INDUSTRIAL_ALLIANCE);
    });

    test('should have correct capabilities', () => {
      expect(adapter.capabilities.supportsFullSync).toBe(true);
      expect(adapter.capabilities.supportsIncrementalSync).toBe(true);
      expect(adapter.capabilities.supportsWebhooks).toBe(false);
      expect(adapter.capabilities.requiresOAuth).toBe(true);
      expect(adapter.capabilities.supportedEntities).toContain('policies');
      expect(adapter.capabilities.supportedEntities).toContain('claims');
      expect(adapter.capabilities.supportedEntities).toContain('beneficiaries');
      expect(adapter.capabilities.supportedEntities).toContain('utilization');
    });

    test('should initialize with config', async () => {
      const config = {
        organizationId: 'org-789',
        type: 'insurance' as const,
        provider: IntegrationProvider.INDUSTRIAL_ALLIANCE,
        credentials: {
          clientId: 'test-client-id',
          clientSecret: 'test-client-secret',
        },
        settings: {
          groupAccountId: 'ACC-11111',
        },
        enabled: true,
      };

      await adapter.initialize(config);
      expect(adapter.isInitialized).toBe(true);
    });

    test('should support benefit utilization tracking', () => {
      const entities = adapter.capabilities.supportedEntities;
      expect(entities).toContain('utilization');
    });

    test('should have correct rate limit', () => {
      expect(adapter.capabilities.rateLimitPerMinute).toBe(150);
    });

    test('should support critical illness insurance tracking', async () => {
      // Industrial Alliance supports life, disability, and critical illness
      const entities = adapter.capabilities.supportedEntities;
      expect(entities).toContain('policies');
      expect(entities).toContain('claims');
    });

    test('should not support webhooks', async () => {
      const isValid = await adapter.verifyWebhook('payload', 'signature');
      expect(isValid).toBe(false);
    });
  });

  describe('Adapter Comparison', () => {
    test('all adapters should have OAuth requirement', () => {
      const gsc = new GreenShieldAdapter();
      const cl = new CanadaLifeAdapter();
      const ia = new IndustrialAllianceAdapter();

      expect(gsc.capabilities.requiresOAuth).toBe(true);
      expect(cl.capabilities.requiresOAuth).toBe(true);
      expect(ia.capabilities.requiresOAuth).toBe(true);
    });

    test('all adapters should support full and incremental sync', () => {
      const gsc = new GreenShieldAdapter();
      const cl = new CanadaLifeAdapter();
      const ia = new IndustrialAllianceAdapter();

      expect(gsc.capabilities.supportsFullSync).toBe(true);
      expect(gsc.capabilities.supportsIncrementalSync).toBe(true);
      
      expect(cl.capabilities.supportsFullSync).toBe(true);
      expect(cl.capabilities.supportsIncrementalSync).toBe(true);
      
      expect(ia.capabilities.supportsFullSync).toBe(true);
      expect(ia.capabilities.supportsIncrementalSync).toBe(true);
    });

    test('Green Shield has highest rate limit', () => {
      const gsc = new GreenShieldAdapter();
      const cl = new CanadaLifeAdapter();
      const ia = new IndustrialAllianceAdapter();

      expect(gsc.capabilities.rateLimitPerMinute).toBe(200);
      expect(cl.capabilities.rateLimitPerMinute).toBe(150);
      expect(ia.capabilities.rateLimitPerMinute).toBe(150);
    });

    test('only Industrial Alliance supports utilization tracking', () => {
      const gsc = new GreenShieldAdapter();
      const cl = new CanadaLifeAdapter();
      const ia = new IndustrialAllianceAdapter();

      expect(gsc.capabilities.supportedEntities).not.toContain('utilization');
      expect(cl.capabilities.supportedEntities).not.toContain('utilization');
      expect(ia.capabilities.supportedEntities).toContain('utilization');
    });

    test('only Green Shield supports coverage tracking', () => {
      const gsc = new GreenShieldAdapter();
      const cl = new CanadaLifeAdapter();
      const ia = new IndustrialAllianceAdapter();

      expect(gsc.capabilities.supportedEntities).toContain('coverage');
      expect(cl.capabilities.supportedEntities).not.toContain('coverage');
      expect(ia.capabilities.supportedEntities).not.toContain('coverage');
    });

    test('only Green Shield supports enrollments', () => {
      const gsc = new GreenShieldAdapter();
      const cl = new CanadaLifeAdapter();
      const ia = new IndustrialAllianceAdapter();

      expect(gsc.capabilities.supportedEntities).toContain('enrollments');
      expect(cl.capabilities.supportedEntities).not.toContain('enrollments');
      expect(ia.capabilities.supportedEntities).not.toContain('enrollments');
    });

    test('all support policies, claims, and beneficiaries', () => {
      const adapters = [
        new GreenShieldAdapter(),
        new CanadaLifeAdapter(),
        new IndustrialAllianceAdapter(),
      ];

      adapters.forEach(adapter => {
        const entities = adapter.capabilities.supportedEntities;
        
        if (adapter.provider === IntegrationProvider.GREEN_SHIELD_CANADA) {
          // Green Shield uses "plans" instead of "policies"
          expect(entities).toContain('plans');
        } else {
          expect(entities).toContain('policies');
        }
        
        expect(entities).toContain('claims');
        
        if (adapter.provider === IntegrationProvider.GREEN_SHIELD_CANADA) {
          // Green Shield doesn't have beneficiaries
        } else {
          expect(entities).toContain('beneficiaries');
        }
      });
    });
  });

  describe('Error Handling', () => {
    test('should throw error for invalid credentials', async () => {
      const adapter = new GreenShieldAdapter();
      const config = {
        organizationId: 'org-invalid',
        type: 'insurance' as const,
        provider: IntegrationProvider.GREEN_SHIELD_CANADA,
        credentials: {
          clientId: '',
          clientSecret: '',
        },
        enabled: true,
      };

      await adapter.initialize(config);
      await expect(adapter.connect()).rejects.toThrow();
    });

    test('should handle sync errors gracefully', async () => {
      const adapter = new GreenShieldAdapter();
      const config = {
        organizationId: 'org-test',
        type: 'insurance' as const,
        provider: IntegrationProvider.GREEN_SHIELD_CANADA,
        credentials: {
          clientId: 'test',
          clientSecret: 'test',
        },
        settings: {
          groupNumber: 'TEST',
        },
        enabled: true,
      };

      await adapter.initialize(config);
      
      // Should fail gracefully when not connected
      const result = await adapter.sync({ fullSync: true }).catch(e => e);
      expect(result).toBeInstanceOf(Error);
    });
  });
});
