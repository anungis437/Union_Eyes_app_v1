/**
 * Entitlements Service Tests
 * 
 * Tests the subscription-tier-based feature gating and credit consumption system.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  checkEntitlement, 
  checkEntitlements,
  consumeCredits, 
  getOrganizationCredits,
  addCredits,
  resetCreditsForBillingCycle,
  getFeaturesForTier,
  isPaidTier,
  featureRequiresCredits,
  getCreditCost,
  TIER_FEATURES,
  TIER_CREDITS,
  CREDIT_COSTS,
  type GatedFeature,
  type SubscriptionTier
} from '@/lib/services/entitlements';

// Mock the database
vi.mock('@/db/db', () => ({
  db: {
    query: {
      organizations: {
        findFirst: vi.fn(),
      },
    },
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve({})),
      })),
    })),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { db } from '@/db/db';

describe('Entitlements Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('TIER_FEATURES', () => {
    it('should define features for free tier', () => {
      expect(TIER_FEATURES.free).toContain('ai_search');
      expect(TIER_FEATURES.free.length).toBe(1);
    });

    it('should define features for basic tier', () => {
      expect(TIER_FEATURES.basic).toContain('ai_search');
      expect(TIER_FEATURES.basic).toContain('ai_summarize');
      expect(TIER_FEATURES.basic).toContain('ai_classify');
    });

    it('should define features for professional tier', () => {
      expect(TIER_FEATURES.professional).toContain('ai_search');
      expect(TIER_FEATURES.professional).toContain('ai_summarize');
      expect(TIER_FEATURES.professional).toContain('ai_extract_clauses');
      expect(TIER_FEATURES.professional).toContain('ai_match_precedents');
      expect(TIER_FEATURES.professional).toContain('api_access');
    });

    it('should include all features in enterprise tier', () => {
      expect(TIER_FEATURES.enterprise.length).toBeGreaterThan(TIER_FEATURES.professional.length);
    });

    it('should have hierarchical inclusion (higher tiers include lower tier features)', () => {
      TIER_FEATURES.free.forEach(feature => {
        expect(TIER_FEATURES.basic).toContain(feature);
      });
      TIER_FEATURES.basic.forEach(feature => {
        expect(TIER_FEATURES.professional).toContain(feature);
      });
      TIER_FEATURES.professional.forEach(feature => {
        expect(TIER_FEATURES.enterprise).toContain(feature);
      });
    });
  });

  describe('TIER_CREDITS', () => {
    it('should allocate 5 credits for free tier', () => {
      expect(TIER_CREDITS.free).toBe(5);
    });

    it('should allocate 50 credits for basic tier', () => {
      expect(TIER_CREDITS.basic).toBe(50);
    });

    it('should allocate 200 credits for professional tier', () => {
      expect(TIER_CREDITS.professional).toBe(200);
    });

    it('should allocate 0 (unlimited) credits for enterprise tier', () => {
      expect(TIER_CREDITS.enterprise).toBe(0);
    });
  });

  describe('CREDIT_COSTS', () => {
    it('should define credit costs for AI features', () => {
      expect(CREDIT_COSTS.ai_search).toBe(1);
      expect(CREDIT_COSTS.ai_summarize).toBe(2);
      expect(CREDIT_COSTS.ai_extract_clauses).toBe(3);
      expect(CREDIT_COSTS.ai_mamba).toBe(5);
    });

    it('should have 0 cost for feedback and ingest features', () => {
      expect(CREDIT_COSTS.ai_feedback).toBe(0);
      expect(CREDIT_COSTS.ai_ingest).toBe(0);
    });
  });

  describe('getFeaturesForTier', () => {
    it('should return features for free tier', () => {
      const features = getFeaturesForTier('free');
      expect(features).toContain('ai_search');
    });

    it('should return features for enterprise tier', () => {
      const features = getFeaturesForTier('enterprise');
      expect(features.length).toBeGreaterThan(10);
    });
  });

  describe('isPaidTier', () => {
    it('should return false for free tier', () => {
      expect(isPaidTier('free')).toBe(false);
    });

    it('should return true for basic tier', () => {
      expect(isPaidTier('basic')).toBe(true);
    });

    it('should return true for professional tier', () => {
      expect(isPaidTier('professional')).toBe(true);
    });

    it('should return true for enterprise tier', () => {
      expect(isPaidTier('enterprise')).toBe(true);
    });
  });

  describe('featureRequiresCredits', () => {
    it('should return true for ai_search', () => {
      expect(featureRequiresCredits('ai_search')).toBe(true);
    });

    it('should return true for ai_mamba', () => {
      expect(featureRequiresCredits('ai_mamba')).toBe(true);
    });

    it('should return false for ai_feedback', () => {
      expect(featureRequiresCredits('ai_feedback')).toBe(false);
    });

    it('should return false for api_access', () => {
      expect(featureRequiresCredits('api_access')).toBe(false);
    });
  });

  describe('getCreditCost', () => {
    it('should return correct credit cost for ai_search', () => {
      expect(getCreditCost('ai_search')).toBe(1);
    });

    it('should return correct credit cost for ai_extract_clauses', () => {
      expect(getCreditCost('ai_extract_clauses')).toBe(3);
    });

    it('should return 0 for unknown feature', () => {
      expect(getCreditCost('unknown_feature' as GatedFeature)).toBe(0);
    });
  });

  describe('checkEntitlement', () => {
    const orgId = 'org-123';

    it('should deny access for unknown organization', async () => {
      vi.mocked(db.query.organizations.findFirst).mockResolvedValueOnce(null);
      
      const result = await checkEntitlement(orgId, 'ai_search');
      
      expect(result.allowed).toBe(false);
      expect(result.tier).toBe('free');
      expect(result.reason).toContain('not found');
    });

    it('should allow free tier to access ai_search', async () => {
      vi.mocked(db.query.organizations.findFirst).mockResolvedValueOnce({
        subscriptionTier: 'free',
        featuresEnabled: [],
      });
      
      const result = await checkEntitlement(orgId, 'ai_search');
      
      expect(result.allowed).toBe(true);
      expect(result.tier).toBe('free');
      expect(result.feature).toBe('ai_search');
    });

    it('should deny free tier access to ai_summarize', async () => {
      vi.mocked(db.query.organizations.findFirst).mockResolvedValueOnce({
        subscriptionTier: 'free',
        featuresEnabled: [],
      });
      
      const result = await checkEntitlement(orgId, 'ai_summarize');
      
      expect(result.allowed).toBe(false);
      expect(result.tier).toBe('free');
      expect(result.reason).toContain('basic');
      expect(result.upgradeUrl).toContain('ai_summarize');
    });

    it('should allow professional tier to access ai_extract_clauses', async () => {
      vi.mocked(db.query.organizations.findFirst).mockResolvedValueOnce({
        subscriptionTier: 'professional',
        featuresEnabled: [],
      });
      
      const result = await checkEntitlement(orgId, 'ai_extract_clauses');
      
      expect(result.allowed).toBe(true);
      expect(result.tier).toBe('professional');
    });

    it('should allow enterprise tier to access all features', async () => {
      vi.mocked(db.query.organizations.findFirst).mockResolvedValueOnce({
        subscriptionTier: 'enterprise',
        featuresEnabled: [],
      });
      
      const result = await checkEntitlement(orgId, 'ai_mamba');
      
      expect(result.allowed).toBe(true);
      expect(result.tier).toBe('enterprise');
    });

    it('should check credit balance for credit-requiring features', async () => {
      vi.mocked(db.query.organizations.findFirst)
        .mockResolvedValueOnce({
          subscriptionTier: 'free',
          featuresEnabled: [],
        })
        .mockResolvedValueOnce({
          subscriptionTier: 'free',
          settings: { credits: 5 },
        });
      
      const result = await checkEntitlement(orgId, 'ai_search');
      
      expect(result.allowed).toBe(true);
      expect(result.currentCredits).toBe(5);
    });

    it('should deny access when credits are exhausted', async () => {
      vi.mocked(db.query.organizations.findFirst)
        .mockResolvedValueOnce({
          subscriptionTier: 'free',
          featuresEnabled: [],
        })
        .mockResolvedValueOnce({
          subscriptionTier: 'free',
          settings: { credits: 0 },
        });
      
      const result = await checkEntitlement(orgId, 'ai_search');
      
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Insufficient credits');
    });

    it('should allow enterprise tier unlimited access regardless of credits', async () => {
      vi.mocked(db.query.organizations.findFirst)
        .mockResolvedValueOnce({
          subscriptionTier: 'enterprise',
          featuresEnabled: [],
        })
        .mockResolvedValueOnce({
          subscriptionTier: 'enterprise',
          settings: { credits: 0 },
        });
      
      const result = await checkEntitlement(orgId, 'ai_mamba');
      
      expect(result.allowed).toBe(true);
      expect(result.tier).toBe('enterprise');
    });
  });

  describe('checkEntitlements', () => {
    const orgId = 'org-123';

    it('should check multiple features at once', async () => {
      vi.mocked(db.query.organizations.findFirst).mockResolvedValue({
        subscriptionTier: 'professional',
        featuresEnabled: [],
      });
      
      const { allAllowed, results } = await checkEntitlements(orgId, [
        'ai_search',
        'ai_summarize',
        'ai_extract_clauses',
      ]);
      
      expect(allAllowed).toBe(true);
      expect(results).toHaveLength(3);
      expect(results.every(r => r.allowed)).toBe(true);
    });

    it('should return false if any feature is not allowed', async () => {
      vi.mocked(db.query.organizations.findFirst).mockResolvedValue({
        subscriptionTier: 'basic',
        featuresEnabled: [],
      });
      
      const { allAllowed, results } = await checkEntitlements(orgId, [
        'ai_search',        // allowed for basic
        'ai_extract_clauses', // NOT allowed for basic
      ]);
      
      expect(allAllowed).toBe(false);
      expect(results[0].allowed).toBe(true);
      expect(results[1].allowed).toBe(false);
    });
  });

  describe('getOrganizationCredits', () => {
    const orgId = 'org-123';

    it('should return credits for free tier', async () => {
      vi.mocked(db.query.organizations.findFirst).mockResolvedValueOnce({
        subscriptionTier: 'free',
        settings: {},
      });
      
      const balance = await getOrganizationCredits(orgId);
      
      expect(balance.tier).toBe('free');
      expect(balance.credits).toBe(5); // default for free
    });

    it('should return custom credits from settings', async () => {
      vi.mocked(db.query.organizations.findFirst).mockResolvedValueOnce({
        subscriptionTier: 'professional',
        settings: { credits: 150 },
      });
      
      const balance = await getOrganizationCredits(orgId);
      
      expect(balance.tier).toBe('professional');
      expect(balance.credits).toBe(150);
    });

    it('should return unlimited credits for enterprise', async () => {
      vi.mocked(db.query.organizations.findFirst).mockResolvedValueOnce({
        subscriptionTier: 'enterprise',
        settings: {},
      });
      
      const balance = await getOrganizationCredits(orgId);
      
      expect(balance.tier).toBe('enterprise');
      expect(balance.credits).toBe(0); // 0 means unlimited
    });

    it('should return default free tier on error', async () => {
      vi.mocked(db.query.organizations.findFirst).mockRejectedValueOnce(new Error('DB error'));
      
      const balance = await getOrganizationCredits(orgId);
      
      expect(balance.tier).toBe('free');
      expect(balance.credits).toBe(5);
    });
  });

  describe('consumeCredits', () => {
    const orgId = 'org-123';

    it('should successfully consume credits', async () => {
      vi.mocked(db.query.organizations.findFirst).mockResolvedValueOnce({
        subscriptionTier: 'professional',
        settings: { credits: 100 },
      });
      
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue({}),
        }),
      } as any);
      
      const result = await consumeCredits(orgId, 10);
      
      expect(result.success).toBe(true);
      expect(result.remainingCredits).toBe(90);
    });

    it('should fail when insufficient credits', async () => {
      vi.mocked(db.query.organizations.findFirst).mockResolvedValueOnce({
        subscriptionTier: 'free',
        settings: { credits: 3 },
      });
      
      const result = await consumeCredits(orgId, 5);
      
      expect(result.success).toBe(false);
      expect(result.remainingCredits).toBe(3);
      expect(result.error).toContain('Insufficient credits');
    });

    it('should allow unlimited consumption for enterprise', async () => {
      vi.mocked(db.query.organizations.findFirst).mockResolvedValueOnce({
        subscriptionTier: 'enterprise',
        settings: {},
      });
      
      const result = await consumeCredits(orgId, 1000);
      
      expect(result.success).toBe(true);
      expect(result.remainingCredits).toBe(0); // unlimited
    });
  });

  describe('addCredits', () => {
    const orgId = 'org-123';

    it('should add credits to organization', async () => {
      vi.mocked(db.query.organizations.findFirst).mockResolvedValueOnce({
        subscriptionTier: 'professional',
        settings: { credits: 100 },
      });
      
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue({}),
        }),
      } as any);
      
      const result = await addCredits(orgId, 50, 'Manual credit addition');
      
      expect(result.success).toBe(true);
      expect(result.newBalance).toBe(150);
    });

    it('should return unlimited for enterprise tier', async () => {
      vi.mocked(db.query.organizations.findFirst).mockResolvedValueOnce({
        subscriptionTier: 'enterprise',
        settings: {},
      });
      
      const result = await addCredits(orgId, 1000);
      
      expect(result.success).toBe(true);
      expect(result.newBalance).toBe(0); // unlimited
    });
  });

  describe('resetCreditsForBillingCycle', () => {
    const orgId = 'org-123';

    it('should reset credits to tier default', async () => {
      vi.mocked(db.query.organizations.findFirst).mockResolvedValueOnce({
        subscriptionTier: 'professional',
        settings: { credits: 10 }, // very low
      });
      
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue({}),
        }),
      } as any);
      
      const result = await resetCreditsForBillingCycle(orgId);
      
      expect(result.success).toBe(true);
      expect(result.newCredits).toBe(200); // professional tier default
    });

    it('should not reset enterprise credits', async () => {
      vi.mocked(db.query.organizations.findFirst).mockResolvedValueOnce({
        subscriptionTier: 'enterprise',
        settings: {},
      });
      
      const result = await resetCreditsForBillingCycle(orgId);
      
      expect(result.success).toBe(true);
      expect(result.newCredits).toBe(0); // unlimited
    });
  });
});
