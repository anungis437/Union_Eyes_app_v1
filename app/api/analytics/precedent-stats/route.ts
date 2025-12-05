import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { 
  arbitrationPrecedents, 
  precedentTags,
  crossOrgAccessLog,
  organizations 
} from "@/db/schema";
import { eq, and, gte, desc, sql } from "drizzle-orm";
import { unstable_cache } from 'next/cache';
import { logger } from '@/lib/logger';

/**
 * GET /api/analytics/precedent-stats
 * 
 * Returns analytics for arbitration precedents:
 * - Most cited precedents
 * - Most viewed precedents
 * - Outcome distribution
 * - Grievance type breakdown
 * - Jurisdiction analysis
 * - Sector statistics
 * 
 * Query params:
 * - fromDate: ISO date string (default: 30 days ago)
 * - toDate: ISO date string (default: now)
 * - sector: Filter by sector
 * - jurisdiction: Filter by jurisdiction
 * - grievanceType: Filter by grievance type
 * - outcome: Filter by outcome
 * - precedentLevel: Filter by precedent level
 * - sharingLevel: Filter by sharing level
 * - limit: Number of top items to return (default: 10)
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const fromDate = searchParams.get("fromDate") || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const toDate = searchParams.get("toDate") || new Date().toISOString();
    const sector = searchParams.get("sector");
    const jurisdiction = searchParams.get("jurisdiction");
    const grievanceType = searchParams.get("grievanceType");
    const outcome = searchParams.get("outcome");
    const precedentLevel = searchParams.get("precedentLevel");
    const sharingLevel = searchParams.get("sharingLevel");
    const limit = parseInt(searchParams.get("limit") || "10");

    // Build WHERE conditions
    const conditions = [
      gte(arbitrationPrecedents.createdAt, new Date(fromDate))
    ];

    if (sector) {
      conditions.push(eq(arbitrationPrecedents.sector, sector));
    }

    if (jurisdiction) {
      conditions.push(eq(arbitrationPrecedents.jurisdiction, jurisdiction));
    }

    if (grievanceType) {
      conditions.push(eq(arbitrationPrecedents.grievanceType, grievanceType));
    }

    if (outcome) {
      conditions.push(eq(arbitrationPrecedents.outcome, outcome));
    }

    if (precedentLevel) {
      conditions.push(eq(arbitrationPrecedents.precedentLevel, precedentLevel));
    }

    if (sharingLevel) {
      conditions.push(eq(arbitrationPrecedents.sharingLevel, sharingLevel));
    }

    // Most cited precedents
    const mostCited = await db
      .select({
        id: arbitrationPrecedents.id,
        caseNumber: arbitrationPrecedents.caseNumber,
        caseTitle: arbitrationPrecedents.caseTitle,
        grievanceType: arbitrationPrecedents.grievanceType,
        outcome: arbitrationPrecedents.outcome,
        precedentLevel: arbitrationPrecedents.precedentLevel,
        citationCount: arbitrationPrecedents.citationCount,
        viewCount: arbitrationPrecedents.viewCount,
        decisionDate: arbitrationPrecedents.decisionDate,
        arbitratorName: arbitrationPrecedents.arbitratorName,
        jurisdiction: arbitrationPrecedents.jurisdiction,
        sector: arbitrationPrecedents.sector,
        sharingLevel: arbitrationPrecedents.sharingLevel,
        sourceOrganization: {
          id: organizations.id,
          name: organizations.name,
          organizationType: organizations.organizationType,
        },
      })
      .from(arbitrationPrecedents)
      .leftJoin(organizations, eq(arbitrationPrecedents.sourceOrganizationId, organizations.id))
      .where(and(...conditions))
      .orderBy(desc(arbitrationPrecedents.citationCount))
      .limit(limit);

    // Most viewed precedents
    const mostViewed = await db
      .select({
        id: arbitrationPrecedents.id,
        caseNumber: arbitrationPrecedents.caseNumber,
        caseTitle: arbitrationPrecedents.caseTitle,
        grievanceType: arbitrationPrecedents.grievanceType,
        outcome: arbitrationPrecedents.outcome,
        precedentLevel: arbitrationPrecedents.precedentLevel,
        viewCount: arbitrationPrecedents.viewCount,
        citationCount: arbitrationPrecedents.citationCount,
        decisionDate: arbitrationPrecedents.decisionDate,
        arbitratorName: arbitrationPrecedents.arbitratorName,
        jurisdiction: arbitrationPrecedents.jurisdiction,
        sector: arbitrationPrecedents.sector,
        sharingLevel: arbitrationPrecedents.sharingLevel,
        sourceOrganization: {
          id: organizations.id,
          name: organizations.name,
          organizationType: organizations.organizationType,
        },
      })
      .from(arbitrationPrecedents)
      .leftJoin(organizations, eq(arbitrationPrecedents.sourceOrganizationId, organizations.id))
      .where(and(...conditions))
      .orderBy(desc(arbitrationPrecedents.viewCount))
      .limit(limit);

    // Outcome distribution
    const outcomeDistribution = await db
      .select({
        outcome: arbitrationPrecedents.outcome,
        count: sql<number>`count(*)::int`,
        totalViews: sql<number>`sum(${arbitrationPrecedents.viewCount})::int`,
        totalCitations: sql<number>`sum(${arbitrationPrecedents.citationCount})::int`,
      })
      .from(arbitrationPrecedents)
      .where(and(...conditions))
      .groupBy(arbitrationPrecedents.outcome)
      .orderBy(desc(sql`count(*)`));

    // Grievance type distribution
    const grievanceTypeDistribution = await db
      .select({
        grievanceType: arbitrationPrecedents.grievanceType,
        count: sql<number>`count(*)::int`,
        totalViews: sql<number>`sum(${arbitrationPrecedents.viewCount})::int`,
        totalCitations: sql<number>`sum(${arbitrationPrecedents.citationCount})::int`,
        avgPrecedentLevel: sql<number>`avg(case when ${arbitrationPrecedents.precedentLevel} = 'high' then 3 when ${arbitrationPrecedents.precedentLevel} = 'medium' then 2 else 1 end)::numeric(3,2)`,
      })
      .from(arbitrationPrecedents)
      .where(and(...conditions))
      .groupBy(arbitrationPrecedents.grievanceType)
      .orderBy(desc(sql`count(*)`))
      .limit(15);

    // Jurisdiction breakdown
    const jurisdictionBreakdown = await db
      .select({
        jurisdiction: arbitrationPrecedents.jurisdiction,
        count: sql<number>`count(*)::int`,
        totalViews: sql<number>`sum(${arbitrationPrecedents.viewCount})::int`,
        totalCitations: sql<number>`sum(${arbitrationPrecedents.citationCount})::int`,
      })
      .from(arbitrationPrecedents)
      .where(and(...conditions))
      .groupBy(arbitrationPrecedents.jurisdiction)
      .orderBy(desc(sql`count(*)`));

    // Sector statistics
    const sectorStatistics = await db
      .select({
        sector: arbitrationPrecedents.sector,
        count: sql<number>`count(*)::int`,
        totalViews: sql<number>`sum(${arbitrationPrecedents.viewCount})::int`,
        totalCitations: sql<number>`sum(${arbitrationPrecedents.citationCount})::int`,
        uphelds: sql<number>`sum(case when ${arbitrationPrecedents.outcome} = 'upheld' then 1 else 0 end)::int`,
        dismissed: sql<number>`sum(case when ${arbitrationPrecedents.outcome} = 'dismissed' then 1 else 0 end)::int`,
      })
      .from(arbitrationPrecedents)
      .where(and(...conditions))
      .groupBy(arbitrationPrecedents.sector)
      .orderBy(desc(sql`count(*)`));

    // Precedent level distribution
    const precedentLevelDistribution = await db
      .select({
        precedentLevel: arbitrationPrecedents.precedentLevel,
        count: sql<number>`count(*)::int`,
        totalCitations: sql<number>`sum(${arbitrationPrecedents.citationCount})::int`,
        avgCitationCount: sql<number>`avg(${arbitrationPrecedents.citationCount})::numeric(10,2)`,
      })
      .from(arbitrationPrecedents)
      .where(and(...conditions))
      .groupBy(arbitrationPrecedents.precedentLevel)
      .orderBy(desc(sql`count(*)`));

    // Top arbitrators
    const topArbitrators = await db
      .select({
        arbitratorName: arbitrationPrecedents.arbitratorName,
        count: sql<number>`count(*)::int`,
        totalCitations: sql<number>`sum(${arbitrationPrecedents.citationCount})::int`,
        avgCitationCount: sql<number>`avg(${arbitrationPrecedents.citationCount})::numeric(10,2)`,
        uphelds: sql<number>`sum(case when ${arbitrationPrecedents.outcome} = 'upheld' then 1 else 0 end)::int`,
        dismissed: sql<number>`sum(case when ${arbitrationPrecedents.outcome} = 'dismissed' then 1 else 0 end)::int`,
      })
      .from(arbitrationPrecedents)
      .where(and(...conditions))
      .groupBy(arbitrationPrecedents.arbitratorName)
      .orderBy(desc(sql`count(*)`))
      .limit(15);

    // Recent activity from access logs
    const recentActivity = await db
      .select({
        id: crossOrgAccessLog.id,
        resourceId: crossOrgAccessLog.resourceId,
        accessType: crossOrgAccessLog.accessType,
        accessedAt: crossOrgAccessLog.accessedAt,
        userOrganization: {
          id: sql<string>`user_org.id`,
          name: sql<string>`user_org.name`,
        },
        resourceOwnerOrganization: {
          id: sql<string>`owner_org.id`,
          name: sql<string>`owner_org.name`,
        },
        caseNumber: arbitrationPrecedents.caseNumber,
        caseTitle: arbitrationPrecedents.caseTitle,
      })
      .from(crossOrgAccessLog)
      .leftJoin(
        sql`organizations user_org`,
        sql`user_org.id = ${crossOrgAccessLog.userOrganizationId}`
      )
      .leftJoin(
        sql`organizations owner_org`,
        sql`owner_org.id = ${crossOrgAccessLog.resourceOwnerOrgId}`
      )
      .leftJoin(
        arbitrationPrecedents,
        eq(crossOrgAccessLog.resourceId, arbitrationPrecedents.id)
      )
      .where(
        and(
          eq(crossOrgAccessLog.resourceType, "precedent"),
          gte(crossOrgAccessLog.accessedAt, new Date(fromDate))
        )
      )
      .orderBy(desc(crossOrgAccessLog.accessedAt))
      .limit(20);

    // Top tags
    const topTags = await db
      .select({
        tagName: precedentTags.tagName,
        count: sql<number>`count(*)::int`,
      })
      .from(precedentTags)
      .leftJoin(arbitrationPrecedents, eq(precedentTags.precedentId, arbitrationPrecedents.id))
      .where(and(...conditions))
      .groupBy(precedentTags.tagName)
      .orderBy(desc(sql`count(*)`))
      .limit(20);

    // Overall statistics
    const totalStats = await db
      .select({
        totalPrecedents: sql<number>`count(*)::int`,
        totalViews: sql<number>`sum(${arbitrationPrecedents.viewCount})::int`,
        totalCitations: sql<number>`sum(${arbitrationPrecedents.citationCount})::int`,
        totalDownloads: sql<number>`sum(${arbitrationPrecedents.downloadCount})::int`,
        uniqueSectors: sql<number>`count(distinct ${arbitrationPrecedents.sector})::int`,
        uniqueJurisdictions: sql<number>`count(distinct ${arbitrationPrecedents.jurisdiction})::int`,
        uniqueArbitrators: sql<number>`count(distinct ${arbitrationPrecedents.arbitratorName})::int`,
        uniqueOrgs: sql<number>`count(distinct ${arbitrationPrecedents.sourceOrganizationId})::int`,
      })
      .from(arbitrationPrecedents)
      .where(and(...conditions));

    return NextResponse.json({
      dateRange: { from: fromDate, to: toDate },
      filters: { sector, jurisdiction, grievanceType, outcome, precedentLevel, sharingLevel },
      statistics: totalStats[0] || {
        totalPrecedents: 0,
        totalViews: 0,
        totalCitations: 0,
        totalDownloads: 0,
        uniqueSectors: 0,
        uniqueJurisdictions: 0,
        uniqueArbitrators: 0,
        uniqueOrgs: 0,
      },
      mostCited,
      mostViewed,
      outcomeDistribution,
      grievanceTypeDistribution,
      jurisdictionBreakdown,
      sectorStatistics,
      precedentLevelDistribution,
      topArbitrators,
      topTags,
      recentActivity,
    });
  } catch (error) {
    logger.error('Error fetching precedent stats', error as Error, {
      correlationId: request.headers.get('x-correlation-id')
    });
    return NextResponse.json(
      { error: "Failed to fetch precedent statistics" },
      { status: 500 }
    );
  }
}
