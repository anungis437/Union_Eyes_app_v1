/**
 * Federation Affiliates API Route
 * 
 * List member unions and organizations affiliated with a specific federation.
 * Includes membership counts, contact information, and affiliation status.
 * 
 * Authentication: Minimum role level 160 (fed_staff)
 * RLS: Organization-level isolation enforced by database policies
 */

import { NextRequest, NextResponse } from 'next/server';
import { organizations, organizationRelationships } from '@/db/schema-organizations';
import { eq, and, desc, or, like, sql } from 'drizzle-orm';
import { logApiAuditEvent } from '@/lib/middleware/api-security';
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';
import { withRLSContext } from '@/lib/db/with-rls-context';
import { checkRateLimit, createRateLimitHeaders } from '@/lib/rate-limiter';
import {
  standardErrorResponse,
  ErrorCode,
} from '@/lib/api/standardized-responses';

/**
 * GET /api/federations/[id]/affiliates
 * List all organizations affiliated with this federation
 * 
 * Query parameters:
 * - type: Filter by organization type (union, local, region)
 * - status: Filter by affiliation status (active/inactive)
 * - sector: Filter by labour sector
 * - search: Search in organization names
 * - include_inactive: Include inactive affiliations (default: false)
 * - sort: Sort by name, member_count, affiliation_date
 * - order: Sort order (asc/desc)
 * - limit: Number of results (default 50, max 200)
 * - offset: Pagination offset
 */
export const GET = async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  return withEnhancedRoleAuth(160, async (request, context) => {
    const { userId } = context;

    try {
      const federationId = params.id;

      // Rate limiting
      const rateLimitResult = await checkRateLimit(userId, {
        limit: 100,
        window: 60,
        identifier: 'federation-affiliates-read',
      });

      if (!rateLimitResult.allowed) {
        return NextResponse.json(
          {
            error: 'Rate limit exceeded. Too many affiliate read requests.',
            resetIn: rateLimitResult.resetIn,
          },
          {
            status: 429,
            headers: createRateLimitHeaders(rateLimitResult),
          }
        );
      }

      const { searchParams } = new URL(request.url);
      const orgType = searchParams.get('type');
      const affiliationStatus = searchParams.get('status');
      const sector = searchParams.get('sector');
      const search = searchParams.get('search');
      const includeInactive = searchParams.get('include_inactive') === 'true';
      const sort = searchParams.get('sort') || 'name';
      const order = searchParams.get('order') || 'asc';
      const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
      const offset = parseInt(searchParams.get('offset') || '0');

      return withRLSContext(async (tx) => {
        // Verify federation exists
        const [federation] = await tx
          .select({
            id: organizations.id,
            name: organizations.name,
            organizationType: organizations.organizationType,
          })
          .from(organizations)
          .where(
            and(
              eq(organizations.id, federationId),
              eq(organizations.organizationType, 'federation')
            )
          );

        if (!federation) {
          return standardErrorResponse(ErrorCode.NOT_FOUND, 'Federation not found');
        }

        // Build query for affiliates
        // Join organization_relationships to get affiliated organizations
        const relationshipConditions = [
          eq(organizationRelationships.parentOrgId, federationId),
          eq(organizationRelationships.relationshipType, 'affiliate'),
        ];

        if (!includeInactive) {
          relationshipConditions.push(
            sql`${organizationRelationships.endDate} IS NULL`
          );
        }

        // Fetch relationships
        const relationships = await tx
          .select({
            childOrgId: organizationRelationships.childOrgId,
            effectiveDate: organizationRelationships.effectiveDate,
            endDate: organizationRelationships.endDate,
            relationshipMetadata: organizationRelationships.metadata,
          })
          .from(organizationRelationships)
          .where(and(...relationshipConditions));

        if (relationships.length === 0) {
          return NextResponse.json({
            affiliates: [],
            federation: {
              id: federation.id,
              name: federation.name,
            },
            pagination: {
              total: 0,
              limit,
              offset,
              hasMore: false,
            },
          });
        }

        const affiliateIds = relationships.map((r) => r.childOrgId);

        // Build conditions for fetching affiliate organizations
        const affiliateConditions = [
          sql`${organizations.id} IN (${sql.join(affiliateIds.map((id) => sql`${id}`), sql`, `)})`,
        ];

        if (orgType) {
          affiliateConditions.push(eq(organizations.organizationType, orgType));
        }

        if (affiliationStatus) {
          affiliateConditions.push(eq(organizations.status, affiliationStatus));
        }

        if (sector) {
          affiliateConditions.push(sql`${sector} = ANY(${organizations.sectors})`);
        }

        if (search) {
          const searchPattern = `%${search}%`;
          affiliateConditions.push(
            or(
              like(organizations.name, searchPattern),
              like(organizations.shortName, searchPattern)
            )!
          );
        }

        // Determine sort column
        const sortColumn =
          sort === 'member_count'
            ? organizations.memberCount
            : sort === 'affiliation_date'
            ? organizations.affiliationDate
            : organizations.name;

        const orderDirection = order === 'desc' ? desc(sortColumn) : sortColumn;

        // Fetch affiliate organizations
        const affiliates = await tx
          .select({
            id: organizations.id,
            name: organizations.name,
            slug: organizations.slug,
            displayName: organizations.displayName,
            shortName: organizations.shortName,
            organizationType: organizations.organizationType,
            provinceTerritory: organizations.provinceTerritory,
            sectors: organizations.sectors,
            email: organizations.email,
            phone: organizations.phone,
            website: organizations.website,
            clcAffiliated: organizations.clcAffiliated,
            charterNumber: organizations.charterNumber,
            memberCount: organizations.memberCount,
            activeMemberCount: organizations.activeMemberCount,
            status: organizations.status,
            affiliationDate: organizations.affiliationDate,
            createdAt: organizations.createdAt,
          })
          .from(organizations)
          .where(and(...affiliateConditions))
          .orderBy(orderDirection)
          .limit(limit)
          .offset(offset);

        // Enrich with relationship data
        const relationshipMap = new Map(
          relationships.map((r) => [
            r.childOrgId,
            {
              effectiveDate: r.effectiveDate,
              endDate: r.endDate,
              metadata: r.relationshipMetadata,
            },
          ])
        );

        const enrichedAffiliates = affiliates.map((affiliate) => {
          const relationship = relationshipMap.get(affiliate.id);
          return {
            ...affiliate,
            relationshipEffectiveDate: relationship?.effectiveDate,
            relationshipEndDate: relationship?.endDate,
            relationshipMetadata: relationship?.metadata,
            isActive: !relationship?.endDate,
          };
        });

        // Calculate totals
        const totalAffiliates = relationships.length;
        const totalMembers = affiliates.reduce((sum, a) => sum + (a.memberCount || 0), 0);
        const activeAffiliates = enrichedAffiliates.filter((a) => a.isActive).length;

        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: `/api/federations/${federationId}/affiliates`,
          method: 'GET',
          eventType: 'success',
          severity: 'low',
          dataType: 'FEDERATION',
          details: {
            federationId,
            totalAffiliates,
            returnedCount: affiliates.length,
            filters: { orgType, affiliationStatus, sector, search },
          },
        });

        return NextResponse.json({
          affiliates: enrichedAffiliates,
          federation: {
            id: federation.id,
            name: federation.name,
          },
          summary: {
            totalAffiliates,
            activeAffiliates,
            totalMembers,
          },
          pagination: {
            total: totalAffiliates,
            limit,
            offset,
            hasMore: offset + limit < totalAffiliates,
          },
        });
      });
    } catch (error) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: `/api/federations/${params.id}/affiliates`,
        method: 'GET',
        eventType: 'error',
        severity: 'high',
        dataType: 'FEDERATION',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      });

      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        error instanceof Error ? error.message : 'Failed to fetch affiliates'
      );
    }
  })(request, context);
};
