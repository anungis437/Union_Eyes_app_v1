/**
 * Federation Dashboard API Route
 * 
 * Comprehensive dashboard metrics for federation executives and staff.
 * Provides key performance indicators, member statistics, financial summaries,
 * and recent activity trends.
 * 
 * Authentication: Minimum role level 160 (fed_staff) or 170 (fed_executive)
 * RLS: Organization-level isolation enforced by database policies
 */

import { NextRequest, NextResponse } from 'next/server';
import { organizations, organizationRelationships } from '@/db/schema-organizations';
import { perCapitaRemittances } from '@/db/schema/clc-per-capita-schema';
import { eq, and, desc, gte, sql, count, sum } from 'drizzle-orm';
import { logApiAuditEvent } from '@/lib/middleware/api-security';
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';
import { withRLSContext } from '@/lib/db/with-rls-context';
import { checkRateLimit, createRateLimitHeaders } from '@/lib/rate-limiter';
import {
  standardErrorResponse,
  standardSuccessResponse,
  ErrorCode,
} from '@/lib/api/standardized-responses';

/**
 * GET /api/federations/[id]/dashboard
 * Retrieve comprehensive dashboard metrics for a federation
 * 
 * Query parameters:
 * - period: Time period for metrics (30d, 90d, 1y, ytd, all) - default: 30d
 * - include_trends: Include historical trend data (default: true)
 */
export const GET = async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  return withEnhancedRoleAuth(160, async (request, context) => {
    const { userId } = context;

    try {
      const federationId = params.id;

      // Rate limiting: 20 dashboard requests per minute per user
      const rateLimitResult = await checkRateLimit(userId, {
        limit: 20,
        window: 60,
        identifier: 'federation-dashboard',
      });

      if (!rateLimitResult.allowed) {
        return NextResponse.json(
          {
            error: 'Rate limit exceeded. Too many dashboard requests.',
            resetIn: rateLimitResult.resetIn,
          },
          {
            status: 429,
            headers: createRateLimitHeaders(rateLimitResult),
          }
        );
      }

      const { searchParams } = new URL(request.url);
      const period = searchParams.get('period') || '30d';
      const includeTrends = searchParams.get('include_trends') !== 'false';

      // Calculate date range based on period
      const now = new Date();
      let startDate: Date;
      
      switch (period) {
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case '1y':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        case 'ytd':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        case 'all':
          startDate = new Date('2000-01-01');
          break;
        case '30d':
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      return withRLSContext(async (tx) => {
        // Fetch federation details
        const [federation] = await tx
          .select({
            id: organizations.id,
            name: organizations.name,
            shortName: organizations.shortName,
            displayName: organizations.displayName,
            organizationType: organizations.organizationType,
            provinceTerritory: organizations.provinceTerritory,
            sectors: organizations.sectors,
            memberCount: organizations.memberCount,
            activeMemberCount: organizations.activeMemberCount,
            lastMemberCountUpdate: organizations.lastMemberCountUpdate,
            perCapitaRate: organizations.perCapitaRate,
            remittanceDay: organizations.remittanceDay,
            lastRemittanceDate: organizations.lastRemittanceDate,
            createdAt: organizations.createdAt,
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

        // 1. Affiliate Statistics
        const [affiliateStats] = await tx
          .select({
            totalAffiliates: count(),
            activeAffiliates: sql<number>`COUNT(*) FILTER (WHERE ${organizationRelationships.endDate} IS NULL)`,
          })
          .from(organizationRelationships)
          .where(
            and(
              eq(organizationRelationships.parentOrgId, federationId),
              eq(organizationRelationships.relationshipType, 'affiliate')
            )
          );

        // 2. Fetch affiliate organizations with member counts
        const affiliates = await tx
          .select({
            id: organizations.id,
            name: organizations.name,
            organizationType: organizations.organizationType,
            memberCount: organizations.memberCount,
            relationshipEndDate: organizationRelationships.endDate,
          })
          .from(organizations)
          .innerJoin(
            organizationRelationships,
            eq(organizations.id, organizationRelationships.childOrgId)
          )
          .where(
            and(
              eq(organizationRelationships.parentOrgId, federationId),
              eq(organizationRelationships.relationshipType, 'affiliate')
            )
          );

        const totalAffiliateMembers = affiliates
          .filter((a) => !a.relationshipEndDate)
          .reduce((sum, a) => sum + (a.memberCount || 0), 0);

        // 3. Financial Summary (Remittances)
        const [financialSummary] = await tx
          .select({
            totalRemittances: count(),
            totalAmount: sum(perCapitaRemittances.totalAmount),
            pendingAmount: sql<string>`SUM(${perCapitaRemittances.totalAmount}) FILTER (WHERE ${perCapitaRemittances.status} = 'pending')`,
            paidAmount: sql<string>`SUM(${perCapitaRemittances.totalAmount}) FILTER (WHERE ${perCapitaRemittances.status} = 'paid')`,
            lateCount: sql<number>`COUNT(*) FILTER (WHERE ${perCapitaRemittances.status} = 'late')`,
          })
          .from(perCapitaRemittances)
          .where(
            and(
              eq(perCapitaRemittances.toOrganizationId, federationId),
              gte(perCapitaRemittances.remittanceDate, startDate.toISOString().split('T')[0])
            )
          );

        // 4. Recent Remittances
        const recentRemittances = await tx
          .select({
            id: perCapitaRemittances.id,
            fromOrganizationId: perCapitaRemittances.fromOrganizationId,
            remittanceMonth: perCapitaRemittances.remittanceMonth,
            remittanceYear: perCapitaRemittances.remittanceYear,
            totalAmount: perCapitaRemittances.totalAmount,
            totalMembers: perCapitaRemittances.totalMembers,
            status: perCapitaRemittances.status,
            remittanceDate: perCapitaRemittances.remittanceDate,
          })
          .from(perCapitaRemittances)
          .where(eq(perCapitaRemittances.toOrganizationId, federationId))
          .orderBy(desc(perCapitaRemittances.remittanceDate))
          .limit(10);

        // 5. Compliance Rate
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();
        
        const [complianceStats] = await tx
          .select({
            expectedRemittances: sql<number>`${affiliateStats.activeAffiliates}`,
            receivedRemittances: count(),
          })
          .from(perCapitaRemittances)
          .where(
            and(
              eq(perCapitaRemittances.toOrganizationId, federationId),
              eq(perCapitaRemittances.remittanceMonth, currentMonth),
              eq(perCapitaRemittances.remittanceYear, currentYear)
            )
          );

        const complianceRate = affiliateStats.activeAffiliates > 0
          ? ((complianceStats.receivedRemittances / affiliateStats.activeAffiliates) * 100).toFixed(1)
          : '0.0';

        // 6. Provincial Distribution (if applicable)
        const provincialDistribution = await tx
          .select({
            province: organizations.provinceTerritory,
            count: count(),
            totalMembers: sum(organizations.memberCount),
          })
          .from(organizations)
          .innerJoin(
            organizationRelationships,
            eq(organizations.id, organizationRelationships.childOrgId)
          )
          .where(
            and(
              eq(organizationRelationships.parentOrgId, federationId),
              eq(organizationRelationships.relationshipType, 'affiliate'),
              sql`${organizationRelationships.endDate} IS NULL`
            )
          )
          .groupBy(organizations.provinceTerritory);

        // 7. Sector Distribution
        const sectorStats = affiliates
          .filter((a) => !a.relationshipEndDate)
          .reduce((acc, affiliate) => {
            const orgType = affiliate.organizationType || 'unknown';
            if (!acc[orgType]) {
              acc[orgType] = { count: 0, members: 0 };
            }
            acc[orgType].count++;
            acc[orgType].members += affiliate.memberCount || 0;
            return acc;
          }, {} as Record<string, { count: number; members: number }>);

        // 8. Trend Data (if requested)
        let trends = null;
        if (includeTrends) {
          const monthlyTrends = await tx
            .select({
              month: perCapitaRemittances.remittanceMonth,
              year: perCapitaRemittances.remittanceYear,
              totalAmount: sum(perCapitaRemittances.totalAmount),
              totalMembers: sum(perCapitaRemittances.totalMembers),
              remittanceCount: count(),
            })
            .from(perCapitaRemittances)
            .where(
              and(
                eq(perCapitaRemittances.toOrganizationId, federationId),
                gte(perCapitaRemittances.remittanceDate, startDate.toISOString().split('T')[0])
              )
            )
            .groupBy(perCapitaRemittances.remittanceMonth, perCapitaRemittances.remittanceYear)
            .orderBy(
              desc(perCapitaRemittances.remittanceYear),
              desc(perCapitaRemittances.remittanceMonth)
            );

          trends = {
            monthly: monthlyTrends,
          };
        }

        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: `/api/federations/${federationId}/dashboard`,
          method: 'GET',
          eventType: 'success',
          severity: 'low',
          dataType: 'FEDERATION',
          details: { federationId, period },
        });

        return NextResponse.json({
          federation: {
            id: federation.id,
            name: federation.name,
            shortName: federation.shortName,
            displayName: federation.displayName,
            provinceTerritory: federation.provinceTerritory,
            sectors: federation.sectors,
            perCapitaRate: federation.perCapitaRate,
            lastRemittanceDate: federation.lastRemittanceDate,
          },
          metrics: {
            affiliates: {
              total: affiliateStats.totalAffiliates || 0,
              active: affiliateStats.activeAffiliates || 0,
              inactive: (affiliateStats.totalAffiliates || 0) - (affiliateStats.activeAffiliates || 0),
            },
            members: {
              total: totalAffiliateMembers,
              federationTotal: federation.memberCount || 0,
              active: federation.activeMemberCount || 0,
            },
            financial: {
              totalRemittances: financialSummary.totalRemittances || 0,
              totalAmount: financialSummary.totalAmount || '0',
              pendingAmount: financialSummary.pendingAmount || '0',
              paidAmount: financialSummary.paidAmount || '0',
              lateCount: financialSummary.lateCount || 0,
            },
            compliance: {
              rate: complianceRate,
              currentMonth: {
                expected: complianceStats.expectedRemittances,
                received: complianceStats.receivedRemittances,
              },
            },
          },
          distribution: {
            byProvince: provincialDistribution,
            byOrgType: sectorStats,
          },
          recentActivity: {
            remittances: recentRemittances,
          },
          trends,
          period: {
            type: period,
            startDate: startDate.toISOString(),
            endDate: now.toISOString(),
          },
        });
      });
    } catch (error) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: `/api/federations/${params.id}/dashboard`,
        method: 'GET',
        eventType: 'error',
        severity: 'high',
        dataType: 'FEDERATION',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      });

      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        error instanceof Error ? error.message : 'Failed to fetch dashboard data'
      );
    }
  })(request, context);
};
