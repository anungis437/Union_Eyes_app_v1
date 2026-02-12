/**
 * HRIS Integration Tests
 * 
 * Tests for Workday, BambooHR, and ADP adapters
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WorkdayAdapter } from '@/lib/integrations/adapters/hris/workday-adapter';
import { BambooHRAdapter } from '@/lib/integrations/adapters/hris/bamboohr-adapter';
import { ADPAdapter } from '@/lib/integrations/adapters/hris/adp-adapter';
import {
  IntegrationType,
  IntegrationProvider,
  SyncType,
  type IntegrationConfig,
} from '@/lib/integrations/types';
import {
  findEmployeeMappings,
  detectSyncConflicts,
  getSyncStats,
  validateEmployeeData,
} from '@/lib/integrations/adapters/hris/sync-utils';

// ============================================================================
// Mock Configuration
// ============================================================================

const mockWorkdayConfig: IntegrationConfig = {
  id: 'test-workday-config',
  organizationId: 'test-org-id',
  type: IntegrationType.HRIS,
  provider: IntegrationProvider.WORKDAY,
  credentials: {
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
  },
  settings: {
    tenantId: 'test-tenant',
    environment: 'sandbox',
  },
  enabled: true,
  webhookUrl: null,
};

const mockBambooConfig: IntegrationConfig = {
  id: 'test-bamboo-config',
  organizationId: 'test-org-id',
  type: IntegrationType.HRIS,
  provider: IntegrationProvider.BAMBOOHR,
  credentials: {
    apiKey: 'test-api-key',
  },
  settings: {
    companyDomain: 'testcompany',
  },
  enabled: true,
  webhookUrl: null,
};

const mockADPConfig: IntegrationConfig = {
  id: 'test-adp-config',
  organizationId: 'test-org-id',
  type: IntegrationType.HRIS,
  provider: IntegrationProvider.ADP,
  credentials: {
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
  },
  settings: {
    environment: 'sandbox',
  },
  enabled: true,
  webhookUrl: null,
};

// ============================================================================
// Workday Adapter Tests
// ============================================================================

describe('WorkdayAdapter', () => {
  let adapter: WorkdayAdapter;

  beforeEach(() => {
    adapter = new WorkdayAdapter();
  });

  afterEach(async () => {
    if (adapter) {
      await adapter.disconnect();
    }
  });

  it('should initialize with correct capabilities', () => {
    expect(adapter).toBeDefined();
    expect(adapter['type']).toBe(IntegrationType.HRIS);
    expect(adapter['provider']).toBe(IntegrationProvider.WORKDAY);
    expect(adapter['capabilities'].supportsFullSync).toBe(true);
    expect(adapter['capabilities'].supportsIncrementalSync).toBe(true);
    expect(adapter['capabilities'].supportsWebhooks).toBe(false);
    expect(adapter['capabilities'].supportedEntities).toContain('employees');
    expect(adapter['capabilities'].supportedEntities).toContain('positions');
    expect(adapter['capabilities'].supportedEntities).toContain('departments');
  });

  it('should initialize with configuration', async () => {
    await adapter.initialize(mockWorkdayConfig);
    expect(adapter['config']).toBe(mockWorkdayConfig);
    expect(adapter['initialized']).toBe(true);
  });

  it('should not support webhook verification', async () => {
    await adapter.initialize(mockWorkdayConfig);
    const isValid = await adapter.verifyWebhook('payload', 'signature');
    expect(isValid).toBe(false);
  });

  it('should throw error when processing webhook', async () => {
    await adapter.initialize(mockWorkdayConfig);
    await expect(
      adapter.processWebhook({
        eventType: 'test',
        payload: {},
        receivedAt: new Date(),
      })
    ).rejects.toThrow('Workday does not support webhooks');
  });
});

// ============================================================================
// BambooHR Adapter Tests
// ============================================================================

describe('BambooHRAdapter', () => {
  let adapter: BambooHRAdapter;

  beforeEach(() => {
    adapter = new BambooHRAdapter();
  });

  afterEach(async () => {
    if (adapter) {
      await adapter.disconnect();
    }
  });

  it('should initialize with correct capabilities', () => {
    expect(adapter).toBeDefined();
    expect(adapter['type']).toBe(IntegrationType.HRIS);
    expect(adapter['provider']).toBe(IntegrationProvider.BAMBOOHR);
    expect(adapter['capabilities'].supportsFullSync).toBe(true);
    expect(adapter['capabilities'].supportsIncrementalSync).toBe(true);
    expect(adapter['capabilities'].supportsWebhooks).toBe(true);
    expect(adapter['capabilities'].requiresOAuth).toBe(false);
    expect(adapter['capabilities'].rateLimitPerMinute).toBe(1000);
  });

  it('should initialize with configuration', async () => {
    await adapter.initialize(mockBambooConfig);
    expect(adapter['config']).toBe(mockBambooConfig);
    expect(adapter['initialized']).toBe(true);
  });

  it('should support webhook verification', async () => {
    await adapter.initialize(mockBambooConfig);
    const isValid = await adapter.verifyWebhook('payload', 'signature');
    expect(isValid).toBe(true); // Currently returns true for all
  });

  it('should process webhook events', async () => {
    await adapter.initialize(mockBambooConfig);
    
    // Should not throw
    await expect(
      adapter.processWebhook({
        eventType: 'employee.updated',
        payload: { employee: { id: '123' } },
        receivedAt: new Date(),
      })
    ).resolves.toBeUndefined();
  });
});

// ============================================================================
// ADP Adapter Tests
// ============================================================================

describe('ADPAdapter', () => {
  let adapter: ADPAdapter;

  beforeEach(() => {
    adapter = new ADPAdapter();
  });

  afterEach(async () => {
    if (adapter) {
      await adapter.disconnect();
    }
  });

  it('should initialize with correct capabilities', () => {
    expect(adapter).toBeDefined();
    expect(adapter['type']).toBe(IntegrationType.HRIS);
    expect(adapter['provider']).toBe(IntegrationProvider.ADP);
    expect(adapter['capabilities'].supportsFullSync).toBe(true);
    expect(adapter['capabilities'].supportsIncrementalSync).toBe(false);
    expect(adapter['capabilities'].supportsWebhooks).toBe(true);
    expect(adapter['capabilities'].rateLimitPerMinute).toBe(50);
  });

  it('should initialize with configuration', async () => {
    await adapter.initialize(mockADPConfig);
    expect(adapter['config']).toBe(mockADPConfig);
    expect(adapter['initialized']).toBe(true);
  });

  it('should support webhook verification', async () => {
    await adapter.initialize(mockADPConfig);
    const isValid = await adapter.verifyWebhook('payload', 'signature');
    expect(isValid).toBe(true); // Currently returns true for all
  });
});

// ============================================================================
// Sync Utilities Tests
// ============================================================================

describe('HRIS Sync Utilities', () => {
  describe('validateEmployeeData', () => {
    it('should validate complete employee data', () => {
      const result = validateEmployeeData({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        employeeId: 'EMP-001',
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const result = validateEmployeeData({
        firstName: null,
        lastName: null,
        email: 'john.doe@example.com',
        employeeId: 'EMP-001',
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing first name');
      expect(result.errors).toContain('Missing last name');
    });

    it('should warn about missing recommended fields', () => {
      const result = validateEmployeeData({
        firstName: 'John',
        lastName: 'Doe',
        email: null,
        employeeId: null,
      });

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Missing email address');
      expect(result.warnings).toContain('Missing employee ID');
    });

    it('should validate email format', () => {
      const result = validateEmployeeData({
        firstName: 'John',
        lastName: 'Doe',
        email: 'invalid-email',
        employeeId: 'EMP-001',
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid email format');
    });
  });

  describe('findEmployeeMappings', () => {
    it('should handle empty results gracefully', async () => {
      // This would require database mocking
      // For now, just ensure it doesn't throw
      await expect(
        findEmployeeMappings('non-existent-org', 'WORKDAY')
      ).resolves.toBeDefined();
    });
  });

  describe('detectSyncConflicts', () => {
    it('should handle empty results gracefully', async () => {
      await expect(
        detectSyncConflicts('non-existent-org', 'WORKDAY')
      ).resolves.toBeDefined();
    });
  });

  describe('getSyncStats', () => {
    it('should return stats structure', async () => {
      const stats = await getSyncStats('test-org-id', 'WORKDAY');

      expect(stats).toHaveProperty('totalEmployees');
      expect(stats).toHaveProperty('mapped');
      expect(stats).toHaveProperty('unmapped');
      expect(stats).toHaveProperty('conflicts');
      expect(typeof stats.totalEmployees).toBe('number');
      expect(typeof stats.mapped).toBe('number');
      expect(typeof stats.unmapped).toBe('number');
    });
  });
});

// ============================================================================
// Integration Error Handling Tests
// ============================================================================

describe('HRIS Error Handling', () => {
  it('should throw error when connecting without initialization', async () => {
    const adapter = new WorkdayAdapter();
    await expect(adapter.connect()).rejects.toThrow();
  });

  it('should throw error when syncing without connection', async () => {
    const adapter = new BambooHRAdapter();
    await adapter.initialize(mockBambooConfig);
    
    await expect(
      adapter.sync({ type: SyncType.FULL })
    ).rejects.toThrow();
  });

  it('should handle health check on disconnected adapter', async () => {
    const adapter = new ADPAdapter();
    await adapter.initialize(mockADPConfig);
    
    const health = await adapter.healthCheck();
    expect(health.healthy).toBe(false);
    expect(health.error).toBeDefined();
  });
});

// ============================================================================
// Adapter Comparison Tests
// ============================================================================

describe('HRIS Adapter Comparison', () => {
  it('should have consistent interface across adapters', () => {
    const workday = new WorkdayAdapter();
    const bamboo = new BambooHRAdapter();
    const adp = new ADPAdapter();

    // Check that all adapters have the same methods
    const methods = [
      'initialize',
      'connect',
      'disconnect',
      'sync',
      'healthCheck',
      'verifyWebhook',
      'processWebhook',
    ];

    for (const method of methods) {
      expect(workday).toHaveProperty(method);
      expect(bamboo).toHaveProperty(method);
      expect(adp).toHaveProperty(method);
    }
  });

  it('should have different rate limits', () => {
    const workday = new WorkdayAdapter();
    const bamboo = new BambooHRAdapter();
    const adp = new ADPAdapter();

    expect(workday['capabilities'].rateLimitPerMinute).toBe(60);
    expect(bamboo['capabilities'].rateLimitPerMinute).toBe(1000);
    expect(adp['capabilities'].rateLimitPerMinute).toBe(50);
  });

  it('should have different OAuth requirements', () => {
    const workday = new WorkdayAdapter();
    const bamboo = new BambooHRAdapter();
    const adp = new ADPAdapter();

    expect(workday['capabilities'].requiresOAuth).toBe(true);
    expect(bamboo['capabilities'].requiresOAuth).toBe(false); // Uses API key
    expect(adp['capabilities'].requiresOAuth).toBe(true);
  });
});
