/**
 * Feature Flag Service Tests
 * 
 * Tests for progressive rollout and pilot mode functionality.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  isFeatureEnabled,
  evaluateFeature,
  evaluateFeatures,
  getEnabledFeatures,
  type FeatureFlagResult,
} from '@/lib/services/feature-flags';

// Mock database
const mockFlags = new Map<string, any>();

const extractFeatureName = (where: any): string | undefined => {
  if (!where) return undefined;

  if (typeof where === 'object') {
    const queryChunks = where.queryChunks || where.SQL?.queryChunks;
    if (Array.isArray(queryChunks)) {
      for (const chunk of queryChunks) {
        if (typeof chunk?.value === 'string') {
          return chunk.value;
        }
      }
    }

    if (typeof where.right?.value === 'string') {
      return where.right.value;
    }

    const value = where._value?.[0]?.right?.value;
    if (typeof value === 'string') {
      return value;
    }

    if (typeof where.value === 'string') {
      return where.value;
    }
  }

  return undefined;
};

vi.mock('@/db/db', () => ({
  db: {
    query: {
      featureFlags: {
        findFirst: vi.fn(async ({ where }: any) => {
          // Extract feature name from where clause
          const featureName = extractFeatureName(where)
            ?? (mockFlags.size === 1 ? Array.from(mockFlags.keys())[0] : undefined);
          return featureName ? (mockFlags.get(featureName) || null) : null;
        }),
        findMany: vi.fn(async () => {
          return Array.from(mockFlags.values()).filter(f => f.enabled);
        }),
      },
    },
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(async () => [{}]),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(async () => [{}]),
      })),
    })),
  },
}));

describe('Feature Flag Service', () => {
  beforeEach(() => {
    mockFlags.clear();
  });
  
  describe('Boolean Flags', () => {
    it('should return true for enabled boolean flag', async () => {
      mockFlags.set('test_feature', {
        id: '1',
        name: 'test_feature',
        type: 'boolean',
        enabled: true,
      });
      
      const enabled = await isFeatureEnabled('test_feature');
      expect(enabled).toBe(true);
    });
    
    it('should return false for disabled boolean flag', async () => {
      mockFlags.set('test_feature', {
        id: '1',
        name: 'test_feature',
        type: 'boolean',
        enabled: false,
      });
      
      const enabled = await isFeatureEnabled('test_feature');
      expect(enabled).toBe(false);
    });
    
    it('should return false for non-existent flag', async () => {
      const enabled = await isFeatureEnabled('non_existent');
      expect(enabled).toBe(false);
    });
  });
  
  describe('Percentage Rollout', () => {
    it('should enable feature for users in rollout percentage', async () => {
      mockFlags.set('test_rollout', {
        id: '1',
        name: 'test_rollout',
        type: 'percentage',
        enabled: true,
        percentage: 100, // 100% rollout
      });
      
      const enabled = await isFeatureEnabled('test_rollout', {
        userId: 'user_123',
      });
      
      expect(enabled).toBe(true);
    });
    
    it('should disable feature for users outside rollout percentage', async () => {
      mockFlags.set('test_rollout', {
        id: '1',
        name: 'test_rollout',
        type: 'percentage',
        enabled: true,
        percentage: 0, // 0% rollout
      });
      
      const enabled = await isFeatureEnabled('test_rollout', {
        userId: 'user_123',
      });
      
      expect(enabled).toBe(false);
    });
    
    it('should be consistent for same user', async () => {
      mockFlags.set('test_rollout', {
        id: '1',
        name: 'test_rollout',
        type: 'percentage',
        enabled: true,
        percentage: 50, // 50% rollout
      });
      
      const userId = 'user_consistent';
      
      const result1 = await isFeatureEnabled('test_rollout', { userId });
      const result2 = await isFeatureEnabled('test_rollout', { userId });
      const result3 = await isFeatureEnabled('test_rollout', { userId });
      
      // Should be consistent across calls
      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
    });
    
    it('should require userId for percentage rollout', async () => {
      mockFlags.set('test_rollout', {
        id: '1',
        name: 'test_rollout',
        type: 'percentage',
        enabled: true,
        percentage: 50,
      });
      
      const result = await evaluateFeature('test_rollout', {});
      expect(result.enabled).toBe(false);
      expect(result.reason).toContain('UserId required');
    });
  });
  
  describe('Tenant/Organization Flags', () => {
    it('should enable feature for allowed tenants', async () => {
      mockFlags.set('test_tenant', {
        id: '1',
        name: 'test_tenant',
        type: 'tenant',
        enabled: true,
        allowedTenants: ['org_123', 'org_456'],
      });
      
      const enabled = await isFeatureEnabled('test_tenant', {
        organizationId: 'org_123',
      });
      
      expect(enabled).toBe(true);
    });
    
    it('should disable feature for non-allowed tenants', async () => {
      mockFlags.set('test_tenant', {
        id: '1',
        name: 'test_tenant',
        type: 'tenant',
        enabled: true,
        allowedTenants: ['org_123'],
      });
      
      const enabled = await isFeatureEnabled('test_tenant', {
        organizationId: 'org_999',
      });
      
      expect(enabled).toBe(false);
    });
    
    it('should require organizationId for tenant flag', async () => {
      mockFlags.set('test_tenant', {
        id: '1',
        name: 'test_tenant',
        type: 'tenant',
        enabled: true,
        allowedTenants: ['org_123'],
      });
      
      const result = await evaluateFeature('test_tenant', {});
      expect(result.enabled).toBe(false);
      expect(result.reason).toContain('OrganizationId required');
    });
  });
  
  describe('User-Specific Flags', () => {
    it('should enable feature for allowed users', async () => {
      mockFlags.set('test_user', {
        id: '1',
        name: 'test_user',
        type: 'user',
        enabled: true,
        allowedUsers: ['user_123', 'user_456'],
      });
      
      const enabled = await isFeatureEnabled('test_user', {
        userId: 'user_123',
      });
      
      expect(enabled).toBe(true);
    });
    
    it('should disable feature for non-allowed users', async () => {
      mockFlags.set('test_user', {
        id: '1',
        name: 'test_user',
        type: 'user',
        enabled: true,
        allowedUsers: ['user_123'],
      });
      
      const enabled = await isFeatureEnabled('test_user', {
        userId: 'user_999',
      });
      
      expect(enabled).toBe(false);
    });
    
    it('should require userId for user flag', async () => {
      mockFlags.set('test_user', {
        id: '1',
        name: 'test_user',
        type: 'user',
        enabled: true,
        allowedUsers: ['user_123'],
      });
      
      const result = await evaluateFeature('test_user', {});
      expect(result.enabled).toBe(false);
      expect(result.reason).toContain('UserId required');
    });
  });
  
  describe('Bulk Evaluation', () => {
    it('should evaluate multiple features at once', async () => {
      mockFlags.set('feature_a', {
        id: '1',
        name: 'feature_a',
        type: 'boolean',
        enabled: true,
      });
      
      mockFlags.set('feature_b', {
        id: '2',
        name: 'feature_b',
        type: 'boolean',
        enabled: false,
      });
      
      mockFlags.set('feature_c', {
        id: '3',
        name: 'feature_c',
        type: 'boolean',
        enabled: true,
      });
      
      const results = await evaluateFeatures([
        'feature_a',
        'feature_b',
        'feature_c',
      ]);
      
      expect(results.feature_a).toBe(true);
      expect(results.feature_b).toBe(false);
      expect(results.feature_c).toBe(true);
    });
    
    it('should return false for non-existent features in bulk', async () => {
      mockFlags.set('feature_a', {
        id: '1',
        name: 'feature_a',
        type: 'boolean',
        enabled: true,
      });
      
      const results = await evaluateFeatures([
        'feature_a',
        'non_existent',
      ]);
      
      expect(results.feature_a).toBe(true);
      expect(results.non_existent).toBe(false);
    });
  });
  
  describe('Get Enabled Features', () => {
    it('should return all enabled features for context', async () => {
      mockFlags.set('feature_a', {
        id: '1',
        name: 'feature_a',
        type: 'boolean',
        enabled: true,
      });
      
      mockFlags.set('feature_b', {
        id: '2',
        name: 'feature_b',
        type: 'boolean',
        enabled: false,
      });
      
      mockFlags.set('feature_c', {
        id: '3',
        name: 'feature_c',
        type: 'user',
        enabled: true,
        allowedUsers: ['user_123'],
      });
      
      const enabled = await getEnabledFeatures({
        userId: 'user_123',
      });
      
      expect(enabled).toContain('feature_a');
      expect(enabled).not.toContain('feature_b');
      expect(enabled).toContain('feature_c');
    });
  });
  
  describe('Evaluation Reasons', () => {
    it('should provide reason for boolean flag', async () => {
      mockFlags.set('test_feature', {
        id: '1',
        name: 'test_feature',
        type: 'boolean',
        enabled: true,
      });
      
      const result = await evaluateFeature('test_feature');
      expect(result.reason).toBe('Boolean flag enabled globally');
    });
    
    it('should provide reason for disabled flag', async () => {
      mockFlags.set('test_feature', {
        id: '1',
        name: 'test_feature',
        type: 'boolean',
        enabled: false,
      });
      
      const result = await evaluateFeature('test_feature');
      expect(result.reason).toBe('Feature globally disabled');
    });
    
    it('should provide reason for non-existent flag', async () => {
      const result = await evaluateFeature('non_existent');
      expect(result.reason).toBe('Feature flag not found in database');
    });
    
    it('should provide reason for percentage rollout', async () => {
      mockFlags.set('test_rollout', {
        id: '1',
        name: 'test_rollout',
        type: 'percentage',
        enabled: true,
        percentage: 100,
      });
      
      const result = await evaluateFeature('test_rollout', {
        userId: 'user_123',
      });
      
      expect(result.reason).toContain('rollout');
      expect(result.reason).toContain('100%');
    });
    
    it('should provide reason for tenant allowlist', async () => {
      mockFlags.set('test_tenant', {
        id: '1',
        name: 'test_tenant',
        type: 'tenant',
        enabled: true,
        allowedTenants: ['org_123'],
      });
      
      const result = await evaluateFeature('test_tenant', {
        organizationId: 'org_123',
      });
      
      expect(result.reason).toContain('Organization in allowlist');
    });
  });
  
  describe('Error Handling', () => {
    it('should fail safe and disable feature on error', async () => {
      // Simulate database error
      const { db } = await import('@/db/db');
      vi.mocked(db.query.featureFlags.findFirst).mockRejectedValueOnce(
        new Error('Database connection failed')
      );
      
      const result = await evaluateFeature('test_feature');
      expect(result.enabled).toBe(false);
      expect(result.reason).toContain('error');
    });
  });
  
  describe('LRO Feature Constants', () => {
    it('should have all LRO feature constants defined', async () => {
      const { LRO_FEATURES } = await import('@/lib/services/feature-flags');
      
      expect(LRO_FEATURES.SIGNALS_API).toBe('lro_signals_api');
      expect(LRO_FEATURES.SIGNALS_UI).toBe('lro_signals_ui');
      expect(LRO_FEATURES.CASE_LIST_FILTERS).toBe('lro_case_list_filters');
      expect(LRO_FEATURES.DASHBOARD_WIDGET).toBe('lro_dashboard_widget');
      expect(LRO_FEATURES.AUTO_REFRESH).toBe('lro_auto_refresh');
      expect(LRO_FEATURES.SIGNAL_DETAILS).toBe('lro_signal_details');
      expect(LRO_FEATURES.FSM_WORKFLOW).toBe('lro_fsm_workflow');
      expect(LRO_FEATURES.SLA_TRACKING).toBe('lro_sla_tracking');
      expect(LRO_FEATURES.DEFENSIBILITY_EXPORTS).toBe('lro_defensibility_exports');
    });
  });
});

