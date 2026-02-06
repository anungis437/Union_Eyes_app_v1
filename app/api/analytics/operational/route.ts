import { NextRequest, NextResponse } from 'next/server';
import { withTenantAuth } from '@/lib/tenant-middleware';
import { db } from '@/db/db';
import { claims, users } from '@/db/schema';
import { eq, and, gte, count, sql } from 'drizzle-orm';

async function handler(req: NextRequest) {
  const tenantId = (req as any).tenantId;
  const searchParams = req.nextUrl.searchParams;
  const daysBack = parseInt(searchParams.get('days') || '30');

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);

  // Get current period metrics
  const [currentMetrics] = await db
    .select({
      queueSize: sql<number>`COUNT(CASE WHEN ${claims.status} IN ('under_review', 'assigned', 'investigation', 'pending_documentation') THEN 1 END)`,
      avgWaitTime: sql<number>`COALESCE(AVG(CASE WHEN ${claims.status} NOT IN ('resolved', 'closed', 'rejected') THEN EXTRACT(EPOCH FROM (NOW() - ${claims.createdAt})) / 3600 END), 0)`,
      totalOnTime: sql<number>`COUNT(CASE WHEN ${claims.status} = 'resolved' AND ${claims.closedAt} IS NOT NULL THEN 1 END)`,
      totalResolved: sql<number>`COUNT(CASE WHEN ${claims.status} = 'resolved' THEN 1 END)`,
    })
    .from(claims)
    .where(
      and(
        eq(claims.organizationId, tenantId),
        gte(claims.incidentDate, startDate)
      )
    );

  // Get steward workload for balance calculation
  const stewardWorkload = await db
    .select({
      stewardId: claims.assignedTo,
      activeCases: count(),
    })
    .from(claims)
    .where(
      and(
        eq(claims.organizationId, tenantId),
        sql`${claims.status} IN ('under_review', 'assigned', 'investigation')`,
        sql`${claims.assignedTo} IS NOT NULL`
      )
    )
    .groupBy(claims.assignedTo);

  // Calculate workload balance (standard deviation as percentage of mean)
  const caseloads = stewardWorkload.map(s => s.activeCases);
  const mean = caseloads.reduce((a, b) => a + b, 0) / (caseloads.length || 1);
  const variance = caseloads.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (caseloads.length || 1);
  const stdDev = Math.sqrt(variance);
  const workloadBalance = mean > 0 ? Math.max(0, 100 - (stdDev / mean * 100)) : 100;

  // SLA compliance
  const slaCompliance = currentMetrics.totalResolved > 0
    ? (currentMetrics.totalOnTime / currentMetrics.totalResolved) * 100
    : 0;

  // Get previous period for comparison
  const prevStartDate = new Date(startDate);
  prevStartDate.setDate(prevStartDate.getDate() - daysBack);

  const [prevMetrics] = await db
    .select({
      queueSize: sql<number>`COUNT(CASE WHEN ${claims.status} IN ('under_review', 'assigned', 'investigation', 'pending_documentation') THEN 1 END)`,
      avgWaitTime: sql<number>`COALESCE(AVG(CASE WHEN ${claims.status} NOT IN ('resolved', 'closed', 'rejected') THEN EXTRACT(EPOCH FROM (${startDate.toISOString()}::timestamp - ${claims.createdAt})) / 3600 END), 0)`,
      totalOnTime: sql<number>`COUNT(CASE WHEN ${claims.status} = 'resolved' AND ${claims.closedAt} IS NOT NULL THEN 1 END)`,
      totalResolved: sql<number>`COUNT(CASE WHEN ${claims.status} = 'resolved' THEN 1 END)`,
    })
    .from(claims)
    .where(
      and(
        eq(claims.organizationId, tenantId),
        gte(claims.incidentDate, prevStartDate),
        sql`${claims.incidentDate} < ${startDate.toISOString()}::timestamp`
      )
    );

  const prevSlaCompliance = prevMetrics.totalResolved > 0
    ? (prevMetrics.totalOnTime / prevMetrics.totalResolved) * 100
    : 0;

  return NextResponse.json({
    queueSize: currentMetrics.queueSize,
    avgWaitTime: currentMetrics.avgWaitTime,
    slaCompliance,
    workloadBalance,
    previousPeriod: {
      queueSize: prevMetrics.queueSize,
      avgWaitTime: prevMetrics.avgWaitTime,
      slaCompliance: prevSlaCompliance,
      workloadBalance: 0, // Would need historical data
    },
  });
}

export const GET = withTenantAuth(handler);
