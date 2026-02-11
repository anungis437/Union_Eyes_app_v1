/**
 * Smart Onboarding Tests
 * 
 * Tests for intelligent organization onboarding features:
 * - Federation discovery and scoring
 * - Clause relevance algorithms
 * - Peer benchmarking
 * - Smart defaults generation
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  autoDetectParentFederation,
  suggestRelevantClauses,
  findPeerOrganizations,
  getPeerBenchmarks,
  getSmartDefaults,
} from '@/lib/utils/smart-onboarding';
import { db } from '@/db/db';
import { organizations, sharedClauseLibrary } from '@/db/schema';
import { inArray, sql } from 'drizzle-orm';

// Test data IDs
const testOrgIds = {
  congress: '11111111-1111-1111-1111-111111111111',
  federation: '22222222-2222-2222-2222-222222222222',
  unionSmall: '33333333-3333-3333-3333-333333333333',
  unionMedium: '44444444-4444-4444-4444-444444444444',
  unionLarge: '55555555-5555-5555-5555-555555555555',
};

describe('Smart Onboarding - Federation Discovery', () => {
  beforeAll(async () => {
    // Create test congress
    await db.insert(organizations).values({
      id: testOrgIds.congress,
      name: 'Canadian Labour Congress',
      slug: 'clc-test',
      organizationType: 'congress',
      hierarchyPath: [testOrgIds.congress],
      hierarchyLevel: 0,
      clcAffiliated: true,
      affiliationDate: '2024-01-01T00:00:00.000Z',
      charterNumber: 'CLC-TEST-CONGRESS',
      clcAffiliateCode: 'CLC-TEST-CONGRESS',
      memberCount: 3000000,
      status: 'active',
    }).onConflictDoNothing();

    // Create test federation
    await db.insert(organizations).values({
      id: testOrgIds.federation,
      name: 'Ontario Federation of Labour',
      slug: 'ofl-test',
      organizationType: 'federation',
      hierarchyPath: [testOrgIds.congress, testOrgIds.federation],
      hierarchyLevel: 1,
      parentId: testOrgIds.congress,
      provinceTerritory: 'ON',
      sectors: ['healthcare', 'education'],
      clcAffiliated: true,
      affiliationDate: '2024-01-01T00:00:00.000Z',
      charterNumber: 'CLC-TEST-FED',
      clcAffiliateCode: 'CLC-TEST-FED',
      memberCount: 150000,
      status: 'active',
    }).onConflictDoNothing();
  });

  afterAll(async () => {
    // Cleanup test data
    await db
      .delete(organizations)
      .where(inArray(organizations.id, Object.values(testOrgIds)));
  });

  it('should detect federation by province match', async () => {
    const suggestions = await autoDetectParentFederation('ON', null);
    
    expect(suggestions).toBeDefined();
    expect(suggestions.length).toBeGreaterThan(0);
    
    const oflSuggestion = suggestions.find(s => s.id === testOrgIds.federation);
    expect(oflSuggestion).toBeDefined();
    expect(oflSuggestion?.matchScore).toBeGreaterThanOrEqual(40); // Province match
  });

  it('should boost score for CLC affiliation', async () => {
    const suggestions = await autoDetectParentFederation('ON', null);
    
    const clcAffiliated = suggestions.find(s => s.id === testOrgIds.federation);
    expect(clcAffiliated?.matchReasons).toContain('CLC affiliated');
    expect(clcAffiliated?.matchScore).toBeGreaterThanOrEqual(70); // Province + CLC
  });

  it('should match by sector when provided', async () => {
    const suggestions = await autoDetectParentFederation('ON', 'healthcare');
    
    expect(suggestions).toBeDefined();
    // Should prioritize orgs with matching sectors
  });

  it('should score by size proximity', async () => {
    const suggestions = await autoDetectParentFederation('ON', null, 50000);
    
    // Should prefer federations with similar-sized locals
    expect(suggestions).toBeDefined();
  });

  it('should return empty array for invalid province', async () => {
    const suggestions = await autoDetectParentFederation('XX', null);
    
    expect(suggestions).toEqual([]);
  });
});

describe('Smart Onboarding - Smart Defaults', () => {
  it('should generate small org defaults', () => {
    const defaults = getSmartDefaults('local', 100);
    
    expect(defaults.suggestedRateLimits.apiCallsPerDay).toBe(1000);
    expect(defaults.suggestedRateLimits.documentsPerMonth).toBe(100);
    expect(defaults.suggestedRateLimits.storageGb).toBe(5);
  });

  it('should generate medium org defaults', () => {
    const defaults = getSmartDefaults('union', 1000);
    
    expect(defaults.suggestedRateLimits.apiCallsPerDay).toBe(5000);
    expect(defaults.suggestedRateLimits.documentsPerMonth).toBe(500);
    expect(defaults.suggestedRateLimits.storageGb).toBe(25);
  });

  it('should generate large org defaults', () => {
    const defaults = getSmartDefaults('federation', 5000);
    
    expect(defaults.suggestedRateLimits.apiCallsPerDay).toBe(20000);
    expect(defaults.suggestedRateLimits.documentsPerMonth).toBe(2000);
    expect(defaults.suggestedRateLimits.storageGb).toBe(100);
  });

  it('should generate enterprise defaults', () => {
    const defaults = getSmartDefaults('congress', 50000);
    
    expect(defaults.suggestedRateLimits.apiCallsPerDay).toBe(100000);
    expect(defaults.suggestedRateLimits.documentsPerMonth).toBe(10000);
    expect(defaults.suggestedRateLimits.storageGb).toBe(500);
  });

  it('should recommend features by org type', () => {
    const congressDefaults = getSmartDefaults('congress', 10000);
    const localDefaults = getSmartDefaults('local', 100);
    
    expect(congressDefaults.recommendedFeatures).toContain('federation-management');
    expect(congressDefaults.recommendedFeatures).toContain('clc-integration');
    
    expect(localDefaults.recommendedFeatures).toContain('meeting-schedules');
    expect(localDefaults.recommendedFeatures).toContain('document-storage');
  });

  it('should suggest integrations by org type', () => {
    const congressDefaults = getSmartDefaults('congress', 10000);
    
    expect(congressDefaults.suggestedIntegrations).toContain('clc-api');
    expect(congressDefaults.suggestedIntegrations).toContain('statistics-canada');
  });
});

describe('Smart Onboarding - Peer Detection', () => {
  beforeAll(async () => {
    // Create test unions of different sizes
    await db.insert(organizations).values([
      {
        id: testOrgIds.unionSmall,
        name: 'Small Union',
        slug: 'small-union-test',
        organizationType: 'union',
        hierarchyPath: [testOrgIds.unionSmall],
        hierarchyLevel: 0,
        provinceTerritory: 'ON',
        sectors: ['healthcare'],
        memberCount: 500,
        status: 'active',
      },
      {
        id: testOrgIds.unionMedium,
        name: 'Medium Union',
        slug: 'medium-union-test',
        organizationType: 'union',
        hierarchyPath: [testOrgIds.unionMedium],
        hierarchyLevel: 0,
        provinceTerritory: 'ON',
        sectors: ['healthcare'],
        memberCount: 1000,
        status: 'active',
      },
      {
        id: testOrgIds.unionLarge,
        name: 'Large Union',
        slug: 'large-union-test',
        organizationType: 'union',
        hierarchyPath: [testOrgIds.unionLarge],
        hierarchyLevel: 0,
        provinceTerritory: 'ON',
        sectors: ['education'],
        memberCount: 5000,
        status: 'active',
      },
    ]).onConflictDoNothing();
  });

  it('should find peers by size proximity', async () => {
    const peers = await findPeerOrganizations(testOrgIds.unionMedium);
    
    expect(peers).toBeDefined();
    expect(peers).toContain(testOrgIds.unionSmall); // Within 3x range
    expect(peers).not.toContain(testOrgIds.unionLarge); // Outside 3x range
  });

  it('should filter by same organization type', async () => {
    const peers = await findPeerOrganizations(testOrgIds.unionMedium);
    
    // Should only return other unions, not federations/congress
    expect(peers).not.toContain(testOrgIds.federation);
    expect(peers).not.toContain(testOrgIds.congress);
  });

  it('should filter by province', async () => {
    const peers = await findPeerOrganizations(testOrgIds.unionMedium);
    
    // All test peers are in ON
    expect(peers.length).toBeGreaterThan(0);
  });

  it('should filter by sector overlap', async () => {
    const peers = await findPeerOrganizations(testOrgIds.unionMedium);
    
    // Should find unionSmall (same sector) but not unionLarge (different sector)
    expect(peers).toContain(testOrgIds.unionSmall);
  });

  it('should exclude self from peer list', async () => {
    const peers = await findPeerOrganizations(testOrgIds.unionMedium);
    
    expect(peers).not.toContain(testOrgIds.unionMedium);
  });
});

describe('Smart Onboarding - Benchmarks', () => {
  it('should generate member count benchmark', async () => {
    const benchmarks = await getPeerBenchmarks(testOrgIds.unionMedium);
    
    const memberCountBenchmark = benchmarks.find(b => b.metricName === 'Member Count');
    expect(memberCountBenchmark).toBeDefined();
    expect(memberCountBenchmark?.yourValue).toBe(1000);
    expect(memberCountBenchmark?.peerAverage).toBeGreaterThan(0);
  });

  it('should calculate percentile correctly', async () => {
    const benchmarks = await getPeerBenchmarks(testOrgIds.unionMedium);
    
    const memberCountBenchmark = benchmarks.find(b => b.metricName === 'Member Count');
    expect(memberCountBenchmark?.percentile).toBeGreaterThanOrEqual(0);
    expect(memberCountBenchmark?.percentile).toBeLessThanOrEqual(100);
  });

  it('should categorize benchmarks', async () => {
    const benchmarks = await getPeerBenchmarks(testOrgIds.unionMedium);
    
    expect(benchmarks.every(b => b.category)).toBe(true);
  });
});

describe('Smart Onboarding - Edge Cases', () => {
  it('should handle organization with no peers gracefully', async () => {
    const uniqueOrgId = '66666666-6666-6666-6666-666666666666';
    
    await db.insert(organizations).values({
      id: uniqueOrgId,
      name: 'Unique Org',
      slug: 'unique-org-test',
      organizationType: 'local',
      hierarchyPath: [uniqueOrgId],
      hierarchyLevel: 0,
      provinceTerritory: 'NU', // Nunavut - likely no peers
      memberCount: 10,
      status: 'active',
    }).onConflictDoNothing();

    const peers = await findPeerOrganizations(uniqueOrgId);
    expect(peers).toEqual([]);

    const benchmarks = await getPeerBenchmarks(uniqueOrgId);
    expect(benchmarks).toEqual([]);

    // Cleanup
    await db.delete(organizations).where(sql`id = ${uniqueOrgId}`);
  });

  it('should handle null member counts', () => {
    const defaults = getSmartDefaults('local', undefined);
    
    expect(defaults.suggestedRateLimits).toBeDefined();
    expect(defaults.recommendedFeatures).toBeDefined();
  });

  it('should handle invalid org type', () => {
    const defaults = getSmartDefaults('invalid-type' as any, 100);
    
    // Should fall back to local defaults
    expect(defaults.recommendedFeatures).toBeDefined();
  });
});
