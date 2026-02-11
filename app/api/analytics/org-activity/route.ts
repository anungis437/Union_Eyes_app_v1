import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { 
  crossOrgAccessLog,
  organizations,
  sharedClauseLibrary,
  arbitrationPrecedents,
  organizationSharingSettings
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
      const organizationType = searchParams.get("organizationType");
      const resourceType = searchParams.get("resourceType");
      const sharingLevel = searchParams.get("sharingLevel");
      const limit = parseInt(searchParams.get("limit") || "10");
      
      logger.info('[org-activity] Request params', { fromDate, toDate, organizationType, resourceType, sharingLevel, limit });

      // Build WHERE conditions for access logs
      const accessLogConditions = [
        gte(crossOrgAccessLog.createdAt, new Date(fromDate))
      ];

      if (resourceType) {
        accessLogConditions.push(eq(crossOrgAccessLog.resourceType, resourceType));
      }

      // Most active organizations (by access count)
      // Most active organizations - simplified to avoid join issues
      const mostActiveOrgsData = await db
        .select({
          organizationId: crossOrgAccessLog.userOrganizationId,
          totalAccesses: sql<number>`count(*)::int`,
          clauseAccesses: sql<number>`sum(case when ${crossOrgAccessLog.resourceType} = 'clause' then 1 else 0 end)::int`,
          precedentAccesses: sql<number>`sum(case when ${crossOrgAccessLog.resourceType} = 'precedent' then 1 else 0 end)::int`,
          views: sql<number>`sum(case when ${crossOrgAccessLog.accessType} = 'view' then 1 else 0 end)::int`,
          downloads: sql<number>`sum(case when ${crossOrgAccessLog.accessType} = 'download' then 1 else 0 end)::int`,
          comparisons: sql<number>`sum(case when ${crossOrgAccessLog.accessType} = 'compare' then 1 else 0 end)::int`,
          citations: sql<number>`sum(case when ${crossOrgAccessLog.accessType} = 'cite' then 1 else 0 end)::int`,
        })
        .from(crossOrgAccessLog)
        .where(and(...accessLogConditions))
        .groupBy(crossOrgAccessLog.userOrganizationId)
        .orderBy(desc(sql`count(*)`))
        .limit(limit);
      
      // SECURITY: Get organization names using parameterized query
      let mostActiveOrgs: any[] = [];
      if (mostActiveOrgsData.length > 0) {
        const activeOrgIds = mostActiveOrgsData.map(o => o.organizationId).filter(Boolean);
        if (activeOrgIds.length > 0) {
          // Use Drizzle's inArray for safe parameterization
          const orgResults = await db
            .select({
              id: organizations.id,
              name: organizations.name,
              organizationType: organizations.organizationType,
            })
            .from(organizations)
            .where(inArray(organizations.id, activeOrgIds));
          const orgData = new Map(orgResults.map(o => [o.id, o]));
          
          mostActiveOrgs = mostActiveOrgsData.map(o => {
            const org = orgData.get(o.organizationId);
            return {
              ...o,
              organizationName: org?.name || 'Unknown',
              organizationType: org?.organizationType || null,
            };
          });
        }
      }

      // Top resource contributors (organizations sharing the most)
      const fromDateObj = new Date(fromDate);
      
      // Query clauses separately
      const clausesConditions = [gte(sharedClauseLibrary.createdAt, fromDateObj)];
      if (sharingLevel) {
        clausesConditions.push(eq(sharedClauseLibrary.sharingLevel, sharingLevel));
      }
      
      const clausesData = await db
        .select({
          sourceOrgId: sharedClauseLibrary.sourceOrganizationId,
          id: sharedClauseLibrary.id,
          viewCount: sharedClauseLibrary.viewCount,
          citationCount: sharedClauseLibrary.citationCount,
        })
        .from(sharedClauseLibrary)
        .where(and(...clausesConditions));
      
      logger.info('[org-activity] clausesData count', { count: clausesData.length });
      logger.debug('[org-activity] clausesData sample', { sample: clausesData[0] });

      // Query precedents separately
      const precedentsConditions = [gte(arbitrationPrecedents.createdAt, fromDateObj)];
      if (sharingLevel) {
        precedentsConditions.push(eq(arbitrationPrecedents.sharingLevel, sharingLevel));
      }
      
      const precedentsData = await db
        .select({
          sourceOrgId: arbitrationPrecedents.sourceOrganizationId,
          id: arbitrationPrecedents.id,
          viewCount: arbitrationPrecedents.viewCount,
          citationCount: arbitrationPrecedents.citationCount,
        })
        .from(arbitrationPrecedents)
        .where(and(...precedentsConditions));
      
      logger.info('[org-activity] precedentsData count', { count: precedentsData.length });
      logger.debug('[org-activity] precedentsData sample', { sample: precedentsData[0] });

      // Aggregate by organization ID
      const orgStats = new Map<string, {
        totalClauses: number;
        totalPrecedents: number;
        clauseViews: number;
        precedentViews: number;
        clauseCitations: number;
        precedentCitations: number;
      }>();

      // Process clauses
      clausesData.forEach(clause => {
        if (!clause.sourceOrgId) return;
        const existing = orgStats.get(clause.sourceOrgId) || {
          totalClauses: 0,
          totalPrecedents: 0,
          clauseViews: 0,
          precedentViews: 0,
          clauseCitations: 0,
          precedentCitations: 0,
        };
        existing.totalClauses++;
        existing.clauseViews += clause.viewCount || 0;
        existing.clauseCitations += clause.citationCount || 0;
        orgStats.set(clause.sourceOrgId, existing);
      });

      // Process precedents
      precedentsData.forEach(precedent => {
        if (!precedent.sourceOrgId) return;
        const existing = orgStats.get(precedent.sourceOrgId) || {
          totalClauses: 0,
          totalPrecedents: 0,
          clauseViews: 0,
          precedentViews: 0,
          clauseCitations: 0,
          precedentCitations: 0,
        };
        existing.totalPrecedents++;
        existing.precedentViews += precedent.viewCount || 0;
        existing.precedentCitations += precedent.citationCount || 0;
        orgStats.set(precedent.sourceOrgId, existing);
      });

      // SECURITY: Get organization details using parameterized query
      const contributorOrgIds = Array.from(orgStats.keys());
      logger.info('[org-activity] contributorOrgIds', { count: contributorOrgIds.length, sample: contributorOrgIds.slice(0, 3) });
      
      let contributorOrgs: Array<{id: string, name: string, organizationType: string | null}> = [];
      if (contributorOrgIds.length > 0) {
        // Use Drizzle's inArray for safe parameterization
        const orgResults = await db
          .select({
            id: organizations.id,
            name: organizations.name,
            organizationType: organizations.organizationType,
          })
          .from(organizations)
          .where(inArray(organizations.id, contributorOrgIds));
        contributorOrgs = orgResults;
      }
      logger.info('[org-activity] contributorOrgs fetched', { count: contributorOrgs.length });
      logger.debug('[org-activity] contributorOrgs sample', { sample: contributorOrgs[0] });

      const orgMap = new Map(contributorOrgs.map(o => [o.id, o]));

      // Combine and format results
      const topContributorsData = Array.from(orgStats.entries())
        .map(([orgId, stats]) => {
          const org = orgMap.get(orgId);
          return {
            organizationId: orgId,
            organizationName: org?.name || 'Unknown',
            organizationType: org?.organizationType || null,
            totalClauses: stats.totalClauses,
            totalPrecedents: stats.totalPrecedents,
            totalResources: stats.totalClauses + stats.totalPrecedents,
            clauseViews: stats.clauseViews,
            precedentViews: stats.precedentViews,
            clauseCitations: stats.clauseCitations,
            precedentCitations: stats.precedentCitations,
          };
        })
        .filter(item => item.totalResources > 0)
        .sort((a, b) => b.totalResources - a.totalResources)
        .slice(0, limit);

      const topContributors = topContributorsData;
      logger.info('[org-activity] topContributors final count', { count: topContributors.length });
      logger.debug('[org-activity] topContributors sample', { sample: topContributors[0] });

      // Access type breakdown
      const accessTypeBreakdown = await db
        .select({
          accessType: crossOrgAccessLog.accessType,
          count: sql<number>`count(*)::int`,
          uniqueUsers: sql<number>`count(distinct ${crossOrgAccessLog.userId})::int`,
          uniqueOrgs: sql<number>`count(distinct ${crossOrgAccessLog.userOrganizationId})::int`,
        })
        .from(crossOrgAccessLog)
        .where(and(...accessLogConditions))
        .groupBy(crossOrgAccessLog.accessType)
        .orderBy(desc(sql`count(*)`));

      // Resource type breakdown
      const resourceTypeBreakdown = await db
        .select({
          resourceType: crossOrgAccessLog.resourceType,
          count: sql<number>`count(*)::int`,
          uniqueUsers: sql<number>`count(distinct ${crossOrgAccessLog.userId})::int`,
          uniqueOrgs: sql<number>`count(distinct ${crossOrgAccessLog.userOrganizationId})::int`,
          uniqueResources: sql<number>`count(distinct ${crossOrgAccessLog.resourceId})::int`,
        })
        .from(crossOrgAccessLog)
        .where(and(...accessLogConditions))
        .groupBy(crossOrgAccessLog.resourceType)
        .orderBy(desc(sql`count(*)`));

      // Cross-organization collaboration patterns - simplified to avoid join issues
      const collaborationData = await db
        .select({
          userOrganizationId: crossOrgAccessLog.userOrganizationId,
          resourceOrganizationId: crossOrgAccessLog.resourceOrganizationId,
          accessCount: sql<number>`count(*)::int`,
          resourceTypes: sql<string[]>`array_agg(distinct ${crossOrgAccessLog.resourceType})`,
          accessTypes: sql<string[]>`array_agg(distinct ${crossOrgAccessLog.accessType})`,
        })
        .from(crossOrgAccessLog)
        .where(
          and(
            ...accessLogConditions,
            sql`${crossOrgAccessLog.userOrganizationId} != ${crossOrgAccessLog.resourceOrganizationId}`
          )
        )
        .groupBy(
          crossOrgAccessLog.userOrganizationId,
          crossOrgAccessLog.resourceOrganizationId
        )
        .orderBy(desc(sql`count(*)`))
        .limit(20);
      
      // Get organization names if we have collaboration data
      let collaborationPatterns: any[] = [];
      if (collaborationData.length > 0) {
        const orgIds = [...new Set([
          ...collaborationData.map(c => c.userOrganizationId),
          ...collaborationData.map(c => c.resourceOrganizationId)
        ].filter(Boolean))];
        
        if (orgIds.length > 0) {
          const idList = orgIds.map(id => `'${id}'`).join(',');
          const orgResult = await db.execute(sql.raw(`
          SELECT id, name FROM organizations WHERE id = ANY(ARRAY[${idList}]::uuid[])
        `));
          const orgNames = new Map(((orgResult.rows || []) as any[]).map(o => [o.id, o.name]));
          
          collaborationPatterns = collaborationData.map(c => ({
            userOrg: orgNames.get(c.userOrganizationId) || 'Unknown',
            resourceOwnerOrg: orgNames.get(c.resourceOrganizationId) || 'Unknown',
            accessCount: c.accessCount,
            resourceTypes: c.resourceTypes,
            accessTypes: c.accessTypes,
          }));
        }
      }

      // Sharing settings adoption - using separate count queries
      const totalOrgsResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(organizationSharingSettings);
      
      const clauseSharingResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(organizationSharingSettings)
        .where(eq(organizationSharingSettings.autoShareClauses, true));
      
      const precedentSharingResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(organizationSharingSettings)
        .where(eq(organizationSharingSettings.autoSharePrecedents, true));
      
      const analyticsSharingResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(organizationSharingSettings)
        .where(eq(organizationSharingSettings.enableAnalyticsSharing, true));
      
      const autoAnonymizeResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(organizationSharingSettings)
        .where(eq(organizationSharingSettings.autoAnonymizeClauses, true));
      
      const alwaysRedactResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(organizationSharingSettings)
        .where(eq(organizationSharingSettings.alwaysRedactMemberNames, true));
      
      const sharingAdoption = [{
        clauseSharingEnabled: clauseSharingResult[0]?.count || 0,
        precedentSharingEnabled: precedentSharingResult[0]?.count || 0,
        analyticsSharingEnabled: analyticsSharingResult[0]?.count || 0,
        totalOrgs: totalOrgsResult[0]?.count || 0,
        autoAnonymize: autoAnonymizeResult[0]?.count || 0,
        alwaysRedact: alwaysRedactResult[0]?.count || 0,
      }];

      // Organization type breakdown - using separate queries to avoid join issues
      const allOrgsBreakdown = await db
        .select({
          organizationType: organizations.organizationType,
          orgCount: sql<number>`count(*)::int`,
        })
        .from(organizations)
        .groupBy(organizations.organizationType);
      
      // Get access logs with organization IDs
      const accessLogsRaw = await db
        .select({
          userOrganizationId: crossOrgAccessLog.userOrganizationId,
        })
        .from(crossOrgAccessLog)
        .where(gte(crossOrgAccessLog.createdAt, fromDateObj));
      
      // Count accesses by organization
      const accessCountByOrg = new Map<string, number>();
      accessLogsRaw.forEach(log => {
        if (log.userOrganizationId) {
          accessCountByOrg.set(log.userOrganizationId, (accessCountByOrg.get(log.userOrganizationId) || 0) + 1);
        }
      });
      
      // Get org types for accessed orgs
      const accessedOrgIds = Array.from(accessCountByOrg.keys());
      let orgTypes = new Map<string, string | null>();
      if (accessedOrgIds.length > 0) {
        const idList = accessedOrgIds.map(id => `'${id}'`).join(',');
        const orgTypesResult = await db.execute(sql.raw(`
        SELECT id, organization_type FROM organizations WHERE id = ANY(ARRAY[${idList}]::uuid[])
      `));
        orgTypes = new Map(((orgTypesResult.rows || []) as any[]).map(o => [o.id, o.organization_type]));
      }
      
      // Aggregate by org type
      const accessByType = new Map<string | null, number>();
      accessCountByOrg.forEach((count, orgId) => {
        const orgType = orgTypes.get(orgId);
        accessByType.set(orgType, (accessByType.get(orgType) || 0) + count);
      });
      
      const orgLevelBreakdownData = allOrgsBreakdown.map(org => ({
        organizationType: org.organizationType,
        totalOrgs: org.orgCount,
        totalAccesses: accessByType.get(org.organizationType) || 0,
        avgAccessesPerOrg: org.orgCount > 0 
          ? Number(((accessByType.get(org.organizationType) || 0) / org.orgCount).toFixed(2))
          : 0
      }));

      // Daily activity trend (last 30 days)
      const dailyActivity = await db
        .select({
          date: sql<string>`date_trunc('day', ${crossOrgAccessLog.createdAt})::date`,
          totalAccesses: sql<number>`count(*)::int`,
          uniqueUsers: sql<number>`count(distinct ${crossOrgAccessLog.userId})::int`,
          uniqueOrgs: sql<number>`count(distinct ${crossOrgAccessLog.userOrganizationId})::int`,
          clauseAccesses: sql<number>`sum(case when ${crossOrgAccessLog.resourceType} = 'clause' then 1 else 0 end)::int`,
          precedentAccesses: sql<number>`sum(case when ${crossOrgAccessLog.resourceType} = 'precedent' then 1 else 0 end)::int`,
        })
        .from(crossOrgAccessLog)
        .where(gte(crossOrgAccessLog.createdAt, new Date(fromDate)))
        .groupBy(sql`date_trunc('day', ${crossOrgAccessLog.createdAt})`)
        .orderBy(sql`date_trunc('day', ${crossOrgAccessLog.createdAt})`);

      // Overall statistics
      const totalStats = await db
        .select({
          totalAccesses: sql<number>`count(*)::int`,
          uniqueUsers: sql<number>`count(distinct ${crossOrgAccessLog.userId})::int`,
          uniqueAccessorOrgs: sql<number>`count(distinct ${crossOrgAccessLog.userOrganizationId})::int`,
          uniqueResourceOwners: sql<number>`count(distinct ${crossOrgAccessLog.resourceOrganizationId})::int`,
          totalCrossOrgAccesses: sql<number>`sum(case when ${crossOrgAccessLog.userOrganizationId} != ${crossOrgAccessLog.resourceOrganizationId} then 1 else 0 end)::int`,
        })
        .from(crossOrgAccessLog)
        .where(and(...accessLogConditions));

      return NextResponse.json({
        dateRange: { from: fromDate, to: toDate },
        filters: { organizationType, resourceType },
        statistics: totalStats[0] || {
          totalAccesses: 0,
          uniqueUsers: 0,
          uniqueAccessorOrgs: 0,
          uniqueResourceOwners: 0,
          totalCrossOrgAccesses: 0,
        },
        mostActiveOrgs,
        topContributors,
        accessTypeBreakdown,
        resourceTypeBreakdown,
        collaborationPatterns,
        sharingAdoption: sharingAdoption[0] || {
          clauseSharingEnabled: 0,
          precedentSharingEnabled: 0,
          analyticsSharingEnabled: 0,
          totalOrgs: 0,
          autoAnonymize: 0,
          alwaysRedact: 0,
        },
        orgLevelBreakdown: orgLevelBreakdownData,
        dailyActivity,
      });
      
      logger.info('[org-activity] SUCCESS - Sending response with contributors', { count: topContributors.length });
    } catch (error) {
      logger.error('[org-activity] ERROR', { error });
      logger.debug('[org-activity] Error stack', { stack: error instanceof Error ? error.stack : 'No stack trace' });
      logger.error('Error fetching org activity stats', error as Error, {
        correlationId: request.headers.get('x-correlation-id')
      });
      return NextResponse.json(
        { error: "Failed to fetch organization activity statistics" },
        { status: 500 }
      );
    }
    })(request);
};

