import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
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

/**
 * GET /api/analytics/org-activity
 * 
 * Returns organization-level activity analytics:
 * - Most active organizations (by access count)
 * - Top resource contributors
 * - Cross-organization collaboration patterns
 * - Access type breakdown
 * - Sharing settings adoption
 * 
 * Query params:
 * - fromDate: ISO date string (default: 30 days ago)
 * - toDate: ISO date string (default: now)
 * - organizationType: Filter by org type (congress, federation, union, local)
 * - resourceType: Filter by resource type (clause, precedent, analytics)
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
    const organizationType = searchParams.get("organizationType");
    const resourceType = searchParams.get("resourceType");
    const limit = parseInt(searchParams.get("limit") || "10");

    // Build WHERE conditions for access logs
    const accessLogConditions = [
      gte(crossOrgAccessLog.accessedAt, new Date(fromDate))
    ];

    if (resourceType) {
      accessLogConditions.push(eq(crossOrgAccessLog.resourceType, resourceType));
    }

    // Most active organizations (by access count)
    const mostActiveOrgs = await db
      .select({
        organizationId: crossOrgAccessLog.userOrganizationId,
        organizationName: sql<string>`org.name`,
        organizationLevel: sql<string>`org.organization_level`,
        totalAccesses: sql<number>`count(*)::int`,
        clauseAccesses: sql<number>`sum(case when ${crossOrgAccessLog.resourceType} = 'clause' then 1 else 0 end)::int`,
        precedentAccesses: sql<number>`sum(case when ${crossOrgAccessLog.resourceType} = 'precedent' then 1 else 0 end)::int`,
        views: sql<number>`sum(case when ${crossOrgAccessLog.accessType} = 'view' then 1 else 0 end)::int`,
        downloads: sql<number>`sum(case when ${crossOrgAccessLog.accessType} = 'download' then 1 else 0 end)::int`,
        comparisons: sql<number>`sum(case when ${crossOrgAccessLog.accessType} = 'compare' then 1 else 0 end)::int`,
        citations: sql<number>`sum(case when ${crossOrgAccessLog.accessType} = 'cite' then 1 else 0 end)::int`,
      })
      .from(crossOrgAccessLog)
      .leftJoin(
        sql`organizations org`,
        sql`org.id = ${crossOrgAccessLog.userOrganizationId}`
      )
      .where(and(...accessLogConditions))
      .groupBy(crossOrgAccessLog.userOrganizationId, sql`org.name`, sql`org.organization_level`)
      .orderBy(desc(sql`count(*)`))
      .limit(limit);

    // Top resource contributors (organizations sharing the most)
    const topContributors = await db
      .select({
        organizationId: sql<string>`org.id`,
        organizationName: sql<string>`org.name`,
        organizationLevel: sql<string>`org.organization_level`,
        totalClauses: sql<number>`count(distinct ${sharedClauseLibrary.id})::int`,
        totalPrecedents: sql<number>`count(distinct ${arbitrationPrecedents.id})::int`,
        totalResources: sql<number>`(count(distinct ${sharedClauseLibrary.id}) + count(distinct ${arbitrationPrecedents.id}))::int`,
        clauseViews: sql<number>`sum(${sharedClauseLibrary.viewCount})::int`,
        precedentViews: sql<number>`sum(${arbitrationPrecedents.viewCount})::int`,
        clauseCitations: sql<number>`sum(${sharedClauseLibrary.citationCount})::int`,
        precedentCitations: sql<number>`sum(${arbitrationPrecedents.citationCount})::int`,
      })
      .from(sql`organizations org`)
      .leftJoin(
        sharedClauseLibrary,
        sql`${sharedClauseLibrary.sourceOrganizationId} = org.id AND ${sharedClauseLibrary.createdAt} >= ${new Date(fromDate)}`
      )
      .leftJoin(
        arbitrationPrecedents,
        sql`${arbitrationPrecedents.sourceOrganizationId} = org.id AND ${arbitrationPrecedents.createdAt} >= ${new Date(fromDate)}`
      )
      .groupBy(sql`org.id`, sql`org.name`, sql`org.organization_level`)
      .having(sql`(count(distinct ${sharedClauseLibrary.id}) + count(distinct ${arbitrationPrecedents.id})) > 0`)
      .orderBy(desc(sql`(count(distinct ${sharedClauseLibrary.id}) + count(distinct ${arbitrationPrecedents.id}))`))
      .limit(limit);

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

    // Cross-organization collaboration patterns
    const collaborationPatterns = await db
      .select({
        userOrg: sql<string>`user_org.name`,
        resourceOwnerOrg: sql<string>`owner_org.name`,
        accessCount: sql<number>`count(*)::int`,
        resourceTypes: sql<string[]>`array_agg(distinct ${crossOrgAccessLog.resourceType})`,
        accessTypes: sql<string[]>`array_agg(distinct ${crossOrgAccessLog.accessType})`,
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
      .where(
        and(
          ...accessLogConditions,
          sql`${crossOrgAccessLog.userOrganizationId} != ${crossOrgAccessLog.resourceOwnerOrgId}`
        )
      )
      .groupBy(sql`user_org.name`, sql`owner_org.name`)
      .orderBy(desc(sql`count(*)`))
      .limit(20);

    // Sharing settings adoption
    const sharingAdoption = await db
      .select({
        clauseSharingEnabled: sql<number>`sum(case when ${organizationSharingSettings.enableClauseSharing} then 1 else 0 end)::int`,
        precedentSharingEnabled: sql<number>`sum(case when ${organizationSharingSettings.enablePrecedentSharing} then 1 else 0 end)::int`,
        analyticsSharingEnabled: sql<number>`sum(case when ${organizationSharingSettings.enableAnalyticsSharing} then 1 else 0 end)::int`,
        totalOrgs: sql<number>`count(*)::int`,
        autoAnonymize: sql<number>`sum(case when ${organizationSharingSettings.autoAnonymizeClauses} then 1 else 0 end)::int`,
        alwaysRedact: sql<number>`sum(case when ${organizationSharingSettings.alwaysRedactMemberNames} then 1 else 0 end)::int`,
      })
      .from(organizationSharingSettings);

    // Organization level breakdown
    const orgLevelBreakdown = await db
      .select({
        organizationLevel: sql<string>`org.organization_level`,
        totalOrgs: sql<number>`count(distinct org.id)::int`,
        totalAccesses: sql<number>`count(${crossOrgAccessLog.id})::int`,
        avgAccessesPerOrg: sql<number>`(count(${crossOrgAccessLog.id})::numeric / nullif(count(distinct org.id), 0))::numeric(10,2)`,
      })
      .from(sql`organizations org`)
      .leftJoin(
        crossOrgAccessLog,
        sql`${crossOrgAccessLog.userOrganizationId} = org.id AND ${crossOrgAccessLog.accessedAt} >= ${new Date(fromDate)}`
      )
      .groupBy(sql`org.organization_level`)
      .orderBy(desc(sql`count(${crossOrgAccessLog.id})`));

    // Daily activity trend (last 30 days)
    const dailyActivity = await db
      .select({
        date: sql<string>`date_trunc('day', ${crossOrgAccessLog.accessedAt})::date`,
        totalAccesses: sql<number>`count(*)::int`,
        uniqueUsers: sql<number>`count(distinct ${crossOrgAccessLog.userId})::int`,
        uniqueOrgs: sql<number>`count(distinct ${crossOrgAccessLog.userOrganizationId})::int`,
        clauseAccesses: sql<number>`sum(case when ${crossOrgAccessLog.resourceType} = 'clause' then 1 else 0 end)::int`,
        precedentAccesses: sql<number>`sum(case when ${crossOrgAccessLog.resourceType} = 'precedent' then 1 else 0 end)::int`,
      })
      .from(crossOrgAccessLog)
      .where(gte(crossOrgAccessLog.accessedAt, new Date(fromDate)))
      .groupBy(sql`date_trunc('day', ${crossOrgAccessLog.accessedAt})`)
      .orderBy(sql`date_trunc('day', ${crossOrgAccessLog.accessedAt})`);

    // Overall statistics
    const totalStats = await db
      .select({
        totalAccesses: sql<number>`count(*)::int`,
        uniqueUsers: sql<number>`count(distinct ${crossOrgAccessLog.userId})::int`,
        uniqueAccessorOrgs: sql<number>`count(distinct ${crossOrgAccessLog.userOrganizationId})::int`,
        uniqueResourceOwners: sql<number>`count(distinct ${crossOrgAccessLog.resourceOwnerOrgId})::int`,
        totalCrossOrgAccesses: sql<number>`sum(case when ${crossOrgAccessLog.userOrganizationId} != ${crossOrgAccessLog.resourceOwnerOrgId} then 1 else 0 end)::int`,
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
      orgLevelBreakdown,
      dailyActivity,
    });
  } catch (error) {
    logger.error('Error fetching org activity stats', error as Error, {
      correlationId: request.headers.get('x-correlation-id')
    });
    return NextResponse.json(
      { error: "Failed to fetch organization activity statistics" },
      { status: 500 }
    );
  }
}
