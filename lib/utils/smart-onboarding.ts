/**
 * Smart Onboarding & Hierarchy Discovery Utilities
 * 
 * Provides intelligent features for organization onboarding:
 * - Auto-discover parent federation from CLC directory
 * - Suggest relevant clauses based on hierarchy
 * - Peer benchmarking
 * - Smart defaults based on sector/province
 * 
 * Implements recommendations from Hierarchy Engine Assessment (Feb 2026)
 */

import { db } from '@/db/db';
import { organizations, sharedClauseLibrary } from '@/db/schema';
import { eq, and, inArray, or, gte, sql } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';
import { logger } from '@/lib/logger';

// =============================================================================
// TYPES
// =============================================================================

type Organization = InferSelectModel<typeof organizations>;

export interface FederationSuggestion {
  id: string;
  name: string;
  organizationType: string;
  province: string | null;
  jurisdiction: string | null;
  memberCount: number;
  matchScore: number;
  matchReasons: string[];
}

export interface ClauseSuggestion {
  clauseId: string;
  clauseTitle: string;
  clauseType: string;
  sourceOrgName: string;
  sharingLevel: string;
  relevanceScore: number;
  relevanceReasons: string[];
}

export interface PeerBenchmark {
  metricName: string;
  yourValue: number;
  peerAverage: number;
  nationalAverage: number;
  percentile: number;
  category: string;
}

export interface SmartDefaults {
  suggestedRateLimits: {
    apiCallsPerDay: number;
    documentsPerMonth: number;
    storageGb: number;
  };
  recommendedFeatures: string[];
  suggestedIntegrations: string[];
}

// =============================================================================
// AUTO-DISCOVER PARENT FEDERATION
// =============================================================================

/**
 * Auto-detect potential parent federation based on province, sector, and size
 * 
 * @param province - Province code (e.g., 'ON', 'BC')
 * @param sector - Industry sector
 * @param estimatedMemberCount - Approximate member count
 * @returns Array of federation suggestions sorted by relevance
 */
export async function autoDetectParentFederation(
  province: string | null,
  sector: string | null,
  estimatedMemberCount?: number
): Promise<FederationSuggestion[]> {
  try {
    // Query for federations in the same province/sector
    const filters: any[] = [
      or(
        eq(organizations.organizationType, 'federation'),
        eq(organizations.organizationType, 'congress')
      ),
      eq(organizations.status, 'active'),
    ];

    if (province) {
      filters.push(eq(organizations.provinceTerritory, province.toUpperCase()));
    }

    const potentialParents = await db.query.organizations.findMany({
      where: and(...filters),
      orderBy: (org, { desc }) => [desc(org.memberCount)],
      limit: 10,
    });

    // Score and rank suggestions
    const suggestions: FederationSuggestion[] = potentialParents.map((org) => {
      const matchReasons: string[] = [];
      let matchScore = 0;

      // Province match (high weight)
      if (province && org.provinceTerritory?.toUpperCase() === province.toUpperCase()) {
        matchScore += 40;
        matchReasons.push(`Same province (${province})`);
      }

      // CLC affiliation (important for congress-level access)
      if (org.clcAffiliated) {
        matchScore += 30;
        matchReasons.push('CLC affiliated');
      }

      // Size proximity (federations with similar-sized locals)
      if (estimatedMemberCount && org.memberCount) {
        const sizeRatio = Math.min(estimatedMemberCount, org.memberCount) / 
                         Math.max(estimatedMemberCount, org.memberCount);
        const sizeScore = sizeRatio * 20;
        matchScore += sizeScore;
        matchReasons.push(`Similar size category`);
      }

      // Organization type bonus
      if (org.organizationType === 'federation') {
        matchScore += 10;
        matchReasons.push('Provincial federation');
      }

      return {
        id: org.id,
        name: org.name,
        organizationType: org.organizationType,
        province: org.provinceTerritory,
        jurisdiction: org.provinceTerritory,
        memberCount: org.memberCount || 0,
        matchScore,
        matchReasons,
      };
    });

    // Sort by match score
    return suggestions.sort((a, b) => b.matchScore - a.matchScore);
  } catch (error) {
    logger.error('Failed to auto-detect parent federation', { error });
    return [];
  }
}

// =============================================================================
// SMART CLAUSE DISCOVERY
// =============================================================================

/**
 * Suggest relevant clauses from parent federation and peer organizations
 * 
 * @param organizationId - Current organization ID
 * @returns Array of clause suggestions with relevance scoring
 */
export async function suggestRelevantClauses(
  organizationId: string
): Promise<ClauseSuggestion[]> {
  try {
    // Fetch organization with hierarchy
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, organizationId),
    });

    if (!org) {
      throw new Error('Organization not found');
    }

    const hierarchyPath = org.hierarchyPath || [];
    const filters: any[] = [
      // Only public/federation/congress level clauses
      inArray(sharedClauseLibrary.sharingLevel, ['public', 'federation', 'congress']),
    ];

    // Filter by sector if available (check first element of sectors array)
    const orgSector = org.sectors && org.sectors.length > 0 ? org.sectors[0] : null;
    if (orgSector) {
      filters.push(eq(sharedClauseLibrary.sector, orgSector));
    }

    // Filter by province if available
    if (org.provinceTerritory) {
      filters.push(eq(sharedClauseLibrary.province, org.provinceTerritory.toUpperCase()));
    }

    // Get clauses from parent organizations in hierarchy
    if (hierarchyPath.length > 0) {
      filters.push(
        inArray(sharedClauseLibrary.sourceOrganizationId, hierarchyPath)
      );
    }

    const relevantClauses = await db.query.sharedClauseLibrary.findMany({
      where: and(...filters),
      with: {
        sourceOrganization: {
          columns: {
            name: true,
            organizationType: true,
          },
        },
      },
      limit: 50,
      orderBy: (clause, { desc }) => [desc(clause.createdAt)],
    });

    // Score and rank suggestions
    const suggestions: ClauseSuggestion[] = relevantClauses.map((clause) => {
      const relevanceReasons: string[] = [];
      let relevanceScore = 0;

      // Sharing level scoring
      if (clause.sharingLevel === 'public') {
        relevanceScore += 20;
        relevanceReasons.push('Publicly available');
      } else if (clause.sharingLevel === 'federation') {
        relevanceScore += 40;
        relevanceReasons.push('Federation-shared');
      } else if (clause.sharingLevel === 'congress') {
        relevanceScore += 50;
        relevanceReasons.push('Congress-level template');
      }

      // Hierarchy proximity (closer in hierarchy = more relevant)
      if (hierarchyPath.includes(clause.sourceOrganizationId)) {
        const hierarchyIndex = hierarchyPath.indexOf(clause.sourceOrganizationId);
        const proximityScore = (hierarchyPath.length - hierarchyIndex) * 15;
        relevanceScore += proximityScore;
        relevanceReasons.push('From parent organization');
      }

      // Sector match
      if (orgSector && clause.sector === orgSector) {
        relevanceScore += 25;
        relevanceReasons.push(`Same sector (${orgSector})`);
      }

      // Province match
      if (org.provinceTerritory && clause.province === org.provinceTerritory.toUpperCase()) {
        relevanceScore += 15;
        relevanceReasons.push(`Same province (${org.provinceTerritory})`);
      }

      return {
        clauseId: clause.id,
        clauseTitle: clause.clauseTitle,
        clauseType: clause.clauseType,
        sourceOrgName: clause.sourceOrganization?.name || 'Unknown',
        sharingLevel: clause.sharingLevel,
        relevanceScore,
        relevanceReasons,
      };
    });

    // Sort by relevance score
    return suggestions.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 20);
  } catch (error) {
    logger.error('Failed to suggest relevant clauses', { error });
    return [];
  }
}

// =============================================================================
// PEER BENCHMARKING
// =============================================================================

/**
 * Find peer organizations based on size, sector, and province
 * 
 * @param organizationId - Current organization ID
 * @returns Array of peer organization IDs
 */
export async function findPeerOrganizations(
  organizationId: string
): Promise<string[]> {
  try {
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, organizationId),
    });

    if (!org) {
      throw new Error('Organization not found');
    }

    const filters: any[] = [
      eq(organizations.status, 'active'),
    ];

    // Same organization type
    if (org.organizationType) {
      filters.push(eq(organizations.organizationType, org.organizationType));
    }

    // Same sector (check for array overlap using PostgreSQL array operator)
    if (org.sectors && org.sectors.length > 0) {
      // Use PostgreSQL array overlap operator && to find orgs with any matching sector
      filters.push(sql`${organizations.sectors} && ${org.sectors}`);
    }

    // Same province
    if (org.provinceTerritory) {
      filters.push(eq(organizations.provinceTerritory, org.provinceTerritory));
    }

    // Similar size (within 3x range)
    if (org.memberCount) {
      const lowerBound = Math.floor(org.memberCount / 3);
      const upperBound = org.memberCount * 3;
      filters.push(
        and(
          gte(organizations.memberCount, lowerBound),
          sql`${organizations.memberCount} <= ${upperBound}`
        )
      );
    }

    const peers = await db.query.organizations.findMany({
      where: and(...filters),
      columns: { id: true },
      limit: 20,
    });

    return peers.map(p => p.id).filter(id => id !== organizationId);
  } catch (error) {
    logger.error('Failed to find peer organizations', { error });
    return [];
  }
}

/**
 * Get benchmarks comparing organization to peers and national averages
 * 
 * @param organizationId - Current organization ID
 * @returns Array of benchmark comparisons
 */
export async function getPeerBenchmarks(
  organizationId: string
): Promise<PeerBenchmark[]> {
  try {
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, organizationId),
    });

    if (!org) {
      throw new Error('Organization not found');
    }

    const peerIds = await findPeerOrganizations(organizationId);
    const benchmarks: PeerBenchmark[] = [];

    // Member count benchmark
    if (org.memberCount && peerIds.length > 0) {
      const peers = await db.query.organizations.findMany({
        where: inArray(organizations.id, peerIds),
        columns: { memberCount: true },
      });

      const peerCounts = peers.map(p => p.memberCount || 0).filter(c => c > 0);
      const peerAverage = peerCounts.reduce((a, b) => a + b, 0) / peerCounts.length;

      // Calculate percentile (simplified)
      const sortedCounts = peerCounts.sort((a, b) => a - b);
      const percentile = (sortedCounts.filter(c => c <= (org.memberCount || 0)).length / sortedCounts.length) * 100;

      benchmarks.push({
        metricName: 'Member Count',
        yourValue: org.memberCount,
        peerAverage: Math.round(peerAverage),
        nationalAverage: 2500, // TODO: Get from CLC API
        percentile: Math.round(percentile),
        category: 'Membership',
      });
    }

    // Add more benchmarks as data becomes available:
    // - Per-capita rates
    // - Staff count
    // - Budget size
    // - Grievance resolution time
    // - Member satisfaction scores

    return benchmarks;
  } catch (error) {
    logger.error('Failed to get peer benchmarks', { error });
    return [];
  }
}

// =============================================================================
// SMART DEFAULTS
// =============================================================================

/**
 * Generate smart defaults for rate limits and features based on org size/type
 * 
 * @param organizationType - Type of organization
 * @param estimatedMemberCount - Estimated member count
 * @returns Smart default configuration
 */
export function getSmartDefaults(
  organizationType: string,
  estimatedMemberCount?: number
): SmartDefaults {
  const memberCount = estimatedMemberCount || 100;

  // Size category determination
  let sizeCategory: 'small' | 'medium' | 'large' | 'enterprise';
  if (memberCount < 500) sizeCategory = 'small';
  else if (memberCount < 2000) sizeCategory = 'medium';
  else if (memberCount < 10000) sizeCategory = 'large';
  else sizeCategory = 'enterprise';

  // Rate limits based on size
  const rateLimits = {
    small: { apiCallsPerDay: 1000, documentsPerMonth: 100, storageGb: 5 },
    medium: { apiCallsPerDay: 5000, documentsPerMonth: 500, storageGb: 25 },
    large: { apiCallsPerDay: 20000, documentsPerMonth: 2000, storageGb: 100 },
    enterprise: { apiCallsPerDay: 100000, documentsPerMonth: 10000, storageGb: 500 },
  };

  // Features based on org type
  const featuresByType: Record<string, string[]> = {
    congress: [
      'federation-management',
      'aggregate-reporting',
      'benchmark-suite',
      'clc-integration',
      'cross-federation-collaboration',
    ],
    federation: [
      'local-management',
      'federation-reporting',
      'shared-clause-library',
      'inter-union-messaging',
    ],
    union: [
      'grievance-management',
      'member-portal',
      'contract-management',
      'dues-tracking',
    ],
    local: [
      'basic-grievance-tracking',
      'member-communication',
      'meeting-schedules',
      'document-storage',
    ],
  };

  // Integrations based on type
  const integrationsByType: Record<string, string[]> = {
    congress: ['clc-api', 'statistics-canada', 'provincial-lrb'],
    federation: ['clc-api', 'provincial-lrb', 'wage-data'],
    union: ['accounting-software', 'email-platforms', 'video-conferencing'],
    local: ['google-workspace', 'microsoft-365', 'zoom'],
  };

  return {
    suggestedRateLimits: rateLimits[sizeCategory],
    recommendedFeatures: featuresByType[organizationType] || featuresByType.local,
    suggestedIntegrations: integrationsByType[organizationType] || integrationsByType.local,
  };
}

// =============================================================================
// ONBOARDING WORKFLOW
// =============================================================================

/**
 * Complete smart onboarding flow for new organization
 * 
 * @param organizationId - Newly created organization ID
 * @returns Onboarding recommendations and setup data
 */
export async function runSmartOnboarding(organizationId: string) {
  try {
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, organizationId),
    });

    if (!org) {
      throw new Error('Organization not found');
    }

    // Step 1: Suggest parent federation
    const orgSector = org.sectors && org.sectors.length > 0 ? org.sectors[0] : null;
    const federationSuggestions = await autoDetectParentFederation(
      org.provinceTerritory || null,
      orgSector,
      org.memberCount || undefined
    );

    // Step 2: Get smart defaults
    const smartDefaults = getSmartDefaults(
      org.organizationType,
      org.memberCount || undefined
    );

    // Step 3: Suggest relevant clauses (if parent federation selected)
    let clauseSuggestions: ClauseSuggestion[] = [];
    if (org.parentId) {
      clauseSuggestions = await suggestRelevantClauses(organizationId);
    }

    // Step 4: Find peer benchmarks
    const benchmarks = await getPeerBenchmarks(organizationId);

    return {
      organization: org,
      federationSuggestions,
      smartDefaults,
      clauseSuggestions,
      benchmarks,
      onboardingComplete: {
        federationSelected: !!org.parentId,
        clausesImported: clauseSuggestions.length > 0,
        benchmarksAvailable: benchmarks.length > 0,
      },
    };
  } catch (error) {
    logger.error('Smart onboarding failed', { error, organizationId });
    throw error;
  }
}
