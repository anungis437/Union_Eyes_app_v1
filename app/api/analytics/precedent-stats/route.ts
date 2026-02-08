import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { 
  arbitrationPrecedents, 
  precedentTags,
  crossOrgAccessLog,
  organizations 
} from "@/db/schema";
import { eq, and, gte, desc, sql, inArray } from "drizzle-orm";
import { unstable_cache } from 'next/cache';
import { logger } from '@/lib/logger';
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";

export const GET = async (request: NextRequest) => {
  return withEnhancedRoleAuth(10, async (request, context) => {
    try {
      const searchParams = request.nextUrl.searchParams;
      const fromDate = searchParams.get("fromDate") || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const toDate = searchParams.get("toDate") || new Date().toISOString();
      const sector = searchParams.get("sector");
      const jurisdiction = searchParams.get("jurisdiction");
      const grievanceType = searchParams.get("grievanceType");
      const outcome = searchParams.get("outcome");
      const precedentLevel = searchParams.get("precedentLevel");
      
      console.log('[precedent-stats] Request params:', { fromDate, toDate, sector, jurisdiction, grievanceType, outcome, precedentLevel });
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
        conditions.push(eq(arbitrationPrecedents.precedentialValue, precedentLevel));
      }

      if (sharingLevel) {
        conditions.push(eq(arbitrationPrecedents.sharingLevel, sharingLevel));
      }

      // Most cited precedents - using separate queries to avoid leftJoin issues
      const mostCitedRaw = await db
        .select({
          id: arbitrationPrecedents.id,
          caseNumber: arbitrationPrecedents.caseNumber,
          caseTitle: arbitrationPrecedents.caseTitle,
          grievanceType: arbitrationPrecedents.grievanceType,
          outcome: arbitrationPrecedents.outcome,
          precedentialValue: arbitrationPrecedents.precedentialValue,
          citationCount: arbitrationPrecedents.citationCount,
          viewCount: arbitrationPrecedents.viewCount,
          decisionDate: arbitrationPrecedents.decisionDate,
          arbitratorName: arbitrationPrecedents.arbitratorName,
          jurisdiction: arbitrationPrecedents.jurisdiction,
          sector: arbitrationPrecedents.sector,
          sharingLevel: arbitrationPrecedents.sharingLevel,
          sourceOrganizationId: arbitrationPrecedents.sourceOrganizationId,
        })
        .from(arbitrationPrecedents)
        .where(and(...conditions))
        .orderBy(desc(arbitrationPrecedents.citationCount))
        .limit(limit);
      
      console.log('[precedent-stats] mostCitedRaw count:', mostCitedRaw.length);
      console.log('[precedent-stats] mostCitedRaw sample:', mostCitedRaw[0]);

      // Get unique organization IDs for mostCited
      const citedOrgIds = [...new Set(mostCitedRaw.map(p => p.sourceOrganizationId).filter(Boolean))];
      console.log('[precedent-stats] citedOrgIds:', citedOrgIds.length, citedOrgIds.slice(0, 3));

      // Fetch organizations for mostCited using raw SQL to avoid Drizzle issues
      let citedOrgs: Array<{id: string, name: string, organizationType: string | null}> = [];
      if (citedOrgIds.length > 0) {
        const idList = citedOrgIds.map(id => `'${id}'`).join(',');
        console.log('[precedent-stats] Executing SQL with idList:', idList);
        const result = await db.execute(sql.raw(`
        SELECT id, name, organization_type as "organizationType"
        FROM organizations
        WHERE id = ANY(ARRAY[${idList}]::uuid[])
      `));
        citedOrgs = result.rows as Array<{id: string, name: string, organizationType: string | null}>;
      }
      console.log('[precedent-stats] citedOrgs fetched:', citedOrgs.length);

      const citedOrgMap = new Map(citedOrgs.map(o => [o.id, o]));

      // Join in memory
      const mostCited = mostCitedRaw.map(p => {
        const org = citedOrgMap.get(p.sourceOrganizationId);
        return {
          ...p,
          sourceOrganization: org ? {
            id: org.id,
            name: org.name,
            organizationType: org.organizationType,
          } : null,
        };
      });
      
      console.log('[precedent-stats] mostCited final count:', mostCited.length);
      console.log('[precedent-stats] mostCited sample with org:', mostCited[0]);

      // Most viewed precedents - using separate queries to avoid leftJoin issues
      const mostViewedRaw = await db
        .select({
          id: arbitrationPrecedents.id,
          caseNumber: arbitrationPrecedents.caseNumber,
          caseTitle: arbitrationPrecedents.caseTitle,
          grievanceType: arbitrationPrecedents.grievanceType,
          outcome: arbitrationPrecedents.outcome,
          precedentialValue: arbitrationPrecedents.precedentialValue,
          viewCount: arbitrationPrecedents.viewCount,
          citationCount: arbitrationPrecedents.citationCount,
          decisionDate: arbitrationPrecedents.decisionDate,
          arbitratorName: arbitrationPrecedents.arbitratorName,
          jurisdiction: arbitrationPrecedents.jurisdiction,
          sector: arbitrationPrecedents.sector,
          sharingLevel: arbitrationPrecedents.sharingLevel,
          sourceOrganizationId: arbitrationPrecedents.sourceOrganizationId,
        })
        .from(arbitrationPrecedents)
        .where(and(...conditions))
        .orderBy(desc(arbitrationPrecedents.viewCount))
        .limit(limit);

      // Get unique organization IDs
      const orgIds = [...new Set(mostViewedRaw.map(p => p.sourceOrganizationId).filter(Boolean))];
      console.log('[precedent-stats] orgIds for mostViewed:', orgIds.length, orgIds.slice(0, 3));

      // Fetch organizations using raw SQL to avoid Drizzle issues
      let orgs: Array<{id: string, name: string, organizationType: string | null}> = [];
      if (orgIds.length > 0) {
        const idList = orgIds.map(id => `'${id}'`).join(',');
        console.log('[precedent-stats] Executing SQL for mostViewed with idList:', idList);
        const result = await db.execute(sql.raw(`
        SELECT id, name, organization_type as "organizationType"
        FROM organizations
        WHERE id = ANY(ARRAY[${idList}]::uuid[])
      `));
        orgs = result.rows as Array<{id: string, name: string, organizationType: string | null}>;
      }
      console.log('[precedent-stats] orgs fetched for mostViewed:', orgs.length);
      console.log('[precedent-stats] orgs sample:', orgs[0]);

      const orgMap = new Map(orgs.map(o => [o.id, o]));

      // Join in memory
      const mostViewed = mostViewedRaw.map(p => {
        const org = orgMap.get(p.sourceOrganizationId);
        return {
          ...p,
          sourceOrganizationName: org?.name || null,
          sourceOrganizationType: org?.organizationType || null,
        };
      });
      
      console.log('[precedent-stats] mostViewed final count:', mostViewed.length);
      console.log('[precedent-stats] mostViewed sample with org:', mostViewed[0]);

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
          avgPrecedentLevel: sql<number>`avg(case when ${arbitrationPrecedents.precedentialValue} = 'high' then 3 when ${arbitrationPrecedents.precedentialValue} = 'medium' then 2 else 1 end)::numeric(3,2)`,
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
          precedentLevel: arbitrationPrecedents.precedentialValue,
          count: sql<number>`count(*)::int`,
          totalCitations: sql<number>`sum(${arbitrationPrecedents.citationCount})::int`,
          avgCitationCount: sql<number>`avg(${arbitrationPrecedents.citationCount})::numeric(10,2)`,
        })
        .from(arbitrationPrecedents)
        .where(and(...conditions))
        .groupBy(arbitrationPrecedents.precedentialValue)
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
      // Fetch recent activity (without leftJoin to avoid orderSelectedFields error)
      const recentActivityRaw = await db
        .select({
          id: crossOrgAccessLog.id,
          resourceId: crossOrgAccessLog.resourceId,
          accessType: crossOrgAccessLog.accessType,
          createdAt: crossOrgAccessLog.createdAt,
          userOrgId: crossOrgAccessLog.userOrganizationId,
          resourceOwnerOrgId: crossOrgAccessLog.resourceOrganizationId,
        })
        .from(crossOrgAccessLog)
        .where(
          and(
            eq(crossOrgAccessLog.resourceType, "precedent"),
            gte(crossOrgAccessLog.createdAt, new Date(fromDate))
          )
        )
        .orderBy(desc(crossOrgAccessLog.createdAt))
        .limit(20);

      // Fetch case details separately
      const resourceIds = recentActivityRaw.map(r => r.resourceId).filter(Boolean);
      const precedentDetails = resourceIds.length > 0
        ? await db
            .select({
              id: arbitrationPrecedents.id,
              caseNumber: arbitrationPrecedents.caseNumber,
              caseTitle: arbitrationPrecedents.caseTitle,
            })
            .from(arbitrationPrecedents)
            .where(sql`${arbitrationPrecedents.id} = ANY(${sql.raw(`ARRAY[${resourceIds.map(id => `'${id}'`).join(',')}]::uuid[]`)})`)
        : [];

      // Merge the results
      const precedentMap = new Map(precedentDetails.map(p => [p.id, p]));
      const recentActivity = recentActivityRaw.map(activity => ({
        ...activity,
        caseNumber: precedentMap.get(activity.resourceId)?.caseNumber ?? null,
        caseTitle: precedentMap.get(activity.resourceId)?.caseTitle ?? null,
      }));

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
      
      console.log('[precedent-stats] SUCCESS - Sending response with mostCited:', mostCited.length, 'mostViewed:', mostViewed.length);
    } catch (error) {
      console.error('[precedent-stats] ERROR:', error);
      console.error('[precedent-stats] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      logger.error('Error fetching precedent stats', error as Error, {
        correlationId: request.headers.get('x-correlation-id')
      });
      return NextResponse.json(
        { error: "Failed to fetch precedent statistics" },
        { status: 500 }
      );
    }
    })(request);
};
