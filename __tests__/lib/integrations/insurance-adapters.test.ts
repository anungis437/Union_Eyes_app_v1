/**
 * Insurance Integration Adapters Tests
 * 
 * Comprehensive tests for insurance/benefits integrations.
 * 
 * Test Coverage:
 * - Sun Life client authentication and API calls
 * - Sun Life adapter sync operations
 * - Manulife client authentication and API calls
 * - Manulife adapter sync operations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SunLifeClient } from '@/lib/integrations/adapters/insurance/sunlife-client';
import { SunLifeAdapter } from '@/lib/integrations/adapters/insurance/sunlife-adapter';
import { ManulifeClient } from '@/lib/integrations/adapters/insurance/manulife-client';
import { ManulifeAdapter } from '@/lib/integrations/adapters/insurance/manulife-adapter';

// ============================================================================
// Mock Global fetch
// ============================================================================

global.fetch = vi.fn();

function mockFetch(response: any, ok = true) {
  (global.fetch as any).mockResolvedValue({
    ok,
    status: ok ? 200 : 400,
    json: async () => response,
    text: async () => JSON.stringify(response),
    headers: new Map(),
  });
}

// ============================================================================
// Sun Life Client Tests
// ============================================================================

describe('SunLifeClient', () => {
  const mockConfig = {
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    groupNumber: 'test-group-number',
    environment: 'sandbox' as const,
    refreshToken: 'test-refresh-token',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should authenticate using refresh token', async () => {
      mockFetch({
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600,
        token_type: 'Bearer',
      });

      const client = new SunLifeClient(mockConfig);
      await client.authenticate();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('sunlife.com'),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should handle authentication errors', async () => {
      mockFetch({ error: 'invalid_grant' }, false);

      const client = new SunLifeClient(mockConfig);
      await expect(client.authenticate()).rejects.toThrow();
    });
  });

  describe('Plan Operations', () => {
    it('should fetch benefit plans', async () => {
      const authResponse = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600,
        token_type: 'Bearer',
      };
      
      const plansResponse = {
        plans: [
          {
            planId: 'plan-1',
            planName: 'Health Plan',
            planType: 'health',
            coverageLevel: 'family',
            effectiveDate: '2024-01-01',
            premium: 500,
            employerContribution: 400,
            employeeContribution: 100,
            status: 'active',
          },
        ],
        pagination: { page: 1, page_size: 100, total: 1, has_more: false },
      };
      
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => authResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => plansResponse,
        });

      const client = new SunLifeClient(mockConfig);
      await client.authenticate();
      
      const plans = await client.getPlans();
      expect(Array.isArray(plans.data)).toBe(true);
      expect(plans.data.length).toBeGreaterThan(0);
    });
  });

  describe('Enrollment Operations', () => {
    it('should fetch enrollments', async () => {
      const authResponse = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600,
        token_type: 'Bearer',
      };
      
      const enrollResponse = {
        enrollments: [
          {
            enrollmentId: 'enroll-1',
            employeeId: 'emp-1',
            employeeName: 'John Doe',
            planId: 'plan-1',
            planName: 'Health Plan',
            coverageLevel: 'family',
            enrollmentDate: '2024-01-01',
            effectiveDate: '2024-01-01',
            status: 'active',
            premium: 500,
            employeeContribution: 100,
          },
        ],
        pagination: { page: 1, page_size: 100, total: 1, has_more: false },
      };
      
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => authResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => enrollResponse,
        });

      const client = new SunLifeClient(mockConfig);
      await client.authenticate();
      
      const enrollments = await client.getEnrollments();
      expect(Array.isArray(enrollments.data)).toBe(true);
    });

    it('should support incremental sync with modifiedSince', async () => {
      const authResponse = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600,
        token_type: 'Bearer',
      };
      
      const enrollResponse = {
        enrollments: [],
        pagination: { page: 1, page_size: 100, total: 0, has_more: false },
      };
      
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => authResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => enrollResponse,
        });

      const client = new SunLifeClient(mockConfig);
      await client.authenticate();
      
      const enrollments = await client.getEnrollments({
        modifiedSince: new Date('2024-01-01'),
      });
      expect(enrollments.data).toEqual([]);
    });
  });

  describe('Rate Limiting', () => {
    it('should handle rate limit errors', async () => {
      mockFetch({ error: 'Rate limit exceeded' }, false);

      const client = new SunLifeClient(mockConfig);
      await expect(client.getPlans()).rejects.toThrow();
    });
  });
});

// ============================================================================
// Sun Life Adapter Tests
// ============================================================================

describe('SunLifeAdapter', () => {
  it('should create adapter instance', () => {
    const adapter = new SunLifeAdapter();
    expect(adapter).toBeDefined();
    expect(adapter.capabilities.supportsFullSync).toBe(true);
    expect(adapter.capabilities.supportsIncrementalSync).toBe(true);
  });

  it('should report correct capabilities', () => {
    const adapter = new SunLifeAdapter();
    expect(adapter.capabilities.supportedEntities).toContain('plans');
    expect(adapter.capabilities.supportedEntities).toContain('enrollments');
    expect(adapter.capabilities.supportedEntities).toContain('dependents');
    expect(adapter.capabilities.supportedEntities).toContain('coverage');
  });
});

// ============================================================================
// Manulife Client Tests
// ============================================================================

describe('ManulifeClient', () => {
  const mockConfig = {
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    policyGroupId: 'test-policy-group-id',
    environment: 'sandbox' as const,
    refreshToken: 'test-refresh-token',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should authenticate using refresh token', async () => {
      mockFetch({
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600,
        token_type: 'Bearer',
      });

      const client = new ManulifeClient(mockConfig);
      await client.authenticate();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('manulife.com'),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should handle authentication errors', async () => {
      mockFetch({ error: 'invalid_grant' }, false);

      const client = new ManulifeClient(mockConfig);
      await expect(client.authenticate()).rejects.toThrow();
    });
  });

  describe('Claims Operations', () => {
    it('should fetch insurance claims', async () => {
      const authResponse = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600,
        token_type: 'Bearer',
      };
      
      const claimsResponse = {
        claims: [
          {
            claimId: 'claim-1',
            claimNumber: 'CLM-001',
            employeeId: 'emp-1',
            employeeName: 'John Doe',
            policyNumber: 'POL-001',
            claimType: 'health',
            serviceDate: '2024-01-15',
            submissionDate: '2024-01-20',
            claimAmount: 1000,
            approvedAmount: 900,
            status: 'approved',
          },
        ],
        pagination: { page: 1, page_size: 100, total: 1, has_more: false },
      };
      
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => authResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => claimsResponse,
        });

      const client = new ManulifeClient(mockConfig);
      await client.authenticate();
      
      const claims = await client.getClaims();
      expect(Array.isArray(claims.data)).toBe(true);
      expect(claims.data.length).toBeGreaterThan(0);
    });

    it('should support incremental sync with modifiedSince', async () => {
      const authResponse = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600,
        token_type: 'Bearer',
      };
      
      const claimsResponse = {
        claims: [],
        pagination: { page: 1, page_size: 100, total: 0, has_more: false },
      };
      
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => authResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => claimsResponse,
        });

      const client = new ManulifeClient(mockConfig);
      await client.authenticate();
      
      const claims = await client.getClaims({
        modifiedSince: new Date('2024-01-01'),
      });
      expect(claims.data).toEqual([]);
    });
  });

  describe('Policy Operations', () => {
    it('should fetch insurance policies', async () => {
      const authResponse = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600,
        token_type: 'Bearer',
      };
      
      const policyResponse = {
        policies: [
          {
            policyId: 'policy-1',
            policyNumber: 'POL-001',
            policyType: 'group_health',
            employeeId: 'emp-1',
            effectiveDate: '2024-01-01',
            coverageAmount: 100000,
            premium: 200,
            status: 'active',
          },
        ],
        pagination: { page: 1, page_size: 100, total: 1, has_more: false },
      };
      
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => authResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => policyResponse,
        });

      const client = new ManulifeClient(mockConfig);
      await client.authenticate();
      
      const policies = await client.getPolicies();
      expect(Array.isArray(policies.data)).toBe(true);
    });
  });

  describe('Rate Limiting', () => {
    it('should handle rate limit errors', async () => {
      mockFetch({ error: 'Rate limit exceeded' }, false);

      const client = new ManulifeClient(mockConfig);
      await expect(client.getClaims()).rejects.toThrow();
    });
  });
});

// ============================================================================
// Manulife Adapter Tests
// ============================================================================

describe('ManulifeAdapter', () => {
  it('should create adapter instance', () => {
    const adapter = new ManulifeAdapter();
    expect(adapter).toBeDefined();
    expect(adapter.capabilities.supportsFullSync).toBe(true);
    expect(adapter.capabilities.supportsIncrementalSync).toBe(true);
  });

  it('should report correct capabilities', () => {
    const adapter = new ManulifeAdapter();
    expect(adapter.capabilities.supportedEntities).toContain('claims');
    expect(adapter.capabilities.supportedEntities).toContain('policies');
    expect(adapter.capabilities.supportedEntities).toContain('beneficiaries');
    expect(adapter.capabilities.supportedEntities).toContain('utilization');
  });
});
