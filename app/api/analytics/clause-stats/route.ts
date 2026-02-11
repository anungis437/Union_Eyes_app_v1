import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { 
  sharedClauseLibrary, 
  clauseLibraryTags,
  crossOrgAccessLog,
  organizations
} from "@/db/schema";
import { eq, and, gte, desc, sql, inArray } from "drizzle-orm";
import { unstable_cache } from 'next/cache';
import { logger } from '@/lib/logger';
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';

export const GET = async (request: NextRequest) => {
  return withEnhancedRoleAuth(10, async (request, context) => {
    try {
      const searchParams = request.nextUrl.searchParams;
      const fromDate = searchParams.get("fromDate") || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const toDate = searchParams.get("toDate") || new Date().toISOString();
      const sector = searchParams.get("sector");
      const province = searchParams.get("province");
      const sharingLevel = searchParams.get("sharingLevel");
      const limit = parseInt(searchParams.get("limit") || "10");

      // Build WHERE conditions
      const conditions = [
        gte(sharedClauseLibrary.createdAt, new Date(fromDate))
      ];

      if (sector) {
        conditions.push(eq(sharedClauseLibrary.sector, sector));
      }

      if (province) {
        conditions.push(eq(sharedClauseLibrary.province, province));
      }

      if (sharingLevel) {
        conditions.push(eq(sharedClauseLibrary.sharingLevel, sharingLevel));
      }

      // Most cited clauses
      const mostCited = await db
        .select({
          id: sharedClauseLibrary.id,
          clauseTitle: sharedClauseLibrary.clauseTitle,
          clauseType: sharedClauseLibrary.clauseType,
          citationCount: sharedClauseLibrary.citationCount,
          viewCount: sharedClauseLibrary.viewCount,
          sector: sharedClauseLibrary.sector,
          province: sharedClauseLibrary.province,
          sharingLevel: sharedClauseLibrary.sharingLevel,
          sourceOrganization: {
            id: organizations.id,
            name: organizations.name,
            organizationType: organizations.organizationType,
          },
        })
        .from(sharedClauseLibrary)
        .leftJoin(organizations, eq(sharedClauseLibrary.sourceOrganizationId, organizations.id))
        .where(and(...conditions))
        .orderBy(desc(sharedClauseLibrary.viewCount))
        .limit(limit);

      // Most viewed clauses
      const mostViewed = await db
        .select({
          id: sharedClauseLibrary.id,
          clauseTitle: sharedClauseLibrary.clauseTitle,
          clauseType: sharedClauseLibrary.clauseType,
          viewCount: sharedClauseLibrary.viewCount,
          citationCount: sharedClauseLibrary.citationCount,
          sector: sharedClauseLibrary.sector,
          province: sharedClauseLibrary.province,
          sharingLevel: sharedClauseLibrary.sharingLevel,
          sourceOrganization: {
            id: organizations.id,
            name: organizations.name,
            organizationType: organizations.organizationType,
          },
        })
        .from(sharedClauseLibrary)
        .leftJoin(organizations, eq(sharedClauseLibrary.sourceOrganizationId, organizations.id))
        .where(and(...conditions))
        .orderBy(desc(sharedClauseLibrary.viewCount))
        .limit(limit);

      // Clause type distribution
      const clauseTypeDistribution = await db
        .select({
          clauseType: sharedClauseLibrary.clauseType,
          count: sql<number>`count(*)::int`,
          totalViews: sql<number>`sum(${sharedClauseLibrary.viewCount})::int`,
          totalCitations: sql<number>`sum(${sharedClauseLibrary.citationCount})::int`,
        })
        .from(sharedClauseLibrary)
        .where(and(...conditions))
        .groupBy(sharedClauseLibrary.clauseType)
        .orderBy(desc(sql`count(*)`))
        .limit(15);

      // Sector distribution
      const sectorDistribution = await db
        .select({
          sector: sharedClauseLibrary.sector,
          count: sql<number>`count(*)::int`,
          totalViews: sql<number>`sum(${sharedClauseLibrary.viewCount})::int`,
          totalCitations: sql<number>`sum(${sharedClauseLibrary.citationCount})::int`,
        })
        .from(sharedClauseLibrary)
        .where(and(...conditions))
        .groupBy(sharedClauseLibrary.sector)
        .orderBy(desc(sql`count(*)`));

      // Recent activity from access logs
      const recentActivity = await db
        .select({
          id: crossOrgAccessLog.id,
          resourceId: crossOrgAccessLog.resourceId,
          accessType: crossOrgAccessLog.accessType,
          createdAt: crossOrgAccessLog.createdAt,
          userOrganization: {
            id: sql<string>`user_org.id`,
            name: sql<string>`user_org.name`,
          },
          resourceOwnerOrganization: {
            id: sql<string>`owner_org.id`,
            name: sql<string>`owner_org.name`,
          },
          clauseTitle: sharedClauseLibrary.clauseTitle,
        })
        .from(crossOrgAccessLog)
        .leftJoin(
          sql`organizations user_org`,
          sql`user_org.id = ${crossOrgAccessLog.userOrganizationId}`
        )
        .leftJoin(
          sql`organizations owner_org`,
          sql`owner_org.id = ${crossOrgAccessLog.resourceOrganizationId}`
        )
        .leftJoin(
          sharedClauseLibrary,
          eq(crossOrgAccessLog.resourceId, sharedClauseLibrary.id)
        )
        .where(
          and(
            eq(crossOrgAccessLog.resourceType, "clause"),
            gte(crossOrgAccessLog.createdAt, new Date(fromDate))
          )
        )
        .orderBy(desc(crossOrgAccessLog.createdAt))
        .limit(20);

      // Top tags
      const topTags = await db
        .select({
          tagName: clauseLibraryTags.tagName,
          count: sql<number>`count(*)::int`,
        })
        .from(clauseLibraryTags)
        .leftJoin(sharedClauseLibrary, eq(clauseLibraryTags.clauseId, sharedClauseLibrary.id))
        .where(and(...conditions))
        .groupBy(clauseLibraryTags.tagName)
        .orderBy(desc(sql`count(*)`))
        .limit(20);

      // Overall statistics
      const totalStats = await db
        .select({
          totalClauses: sql<number>`count(*)::int`,
          totalViews: sql<number>`sum(${sharedClauseLibrary.viewCount})::int`,
          totalCitations: sql<number>`sum(${sharedClauseLibrary.citationCount})::int`,
          totalComparisons: sql<number>`sum(${sharedClauseLibrary.comparisonCount})::int`,
          uniqueSectors: sql<number>`count(distinct ${sharedClauseLibrary.sector})::int`,
          uniqueProvinces: sql<number>`count(distinct ${sharedClauseLibrary.province})::int`,
          uniqueOrgs: sql<number>`count(distinct ${sharedClauseLibrary.sourceOrganizationId})::int`,
        })
        .from(sharedClauseLibrary)
        .where(and(...conditions));

      return NextResponse.json({
        dateRange: { from: fromDate, to: toDate },
        filters: { sector, province, sharingLevel },
        statistics: totalStats[0] || {
          totalClauses: 0,
          totalViews: 0,
          totalCitations: 0,
          totalComparisons: 0,
          uniqueSectors: 0,
          uniqueProvinces: 0,
          uniqueOrgs: 0,
        },
        mostCited,
        mostViewed,
        clauseTypeDistribution,
        sectorDistribution,
        topTags,
        recentActivity,
      });
    } catch (error) {
      logger.error('Error fetching clause stats', error as Error, {
        correlationId: request.headers.get('x-correlation-id')
      });
      return NextResponse.json(
        { error: "Failed to fetch clause statistics" },
        { status: 500 }
      );
    }
    })(request);
};

