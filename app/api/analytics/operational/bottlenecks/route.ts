import { withRLSContext } from '@/lib/db/with-rls-context';
import { NextRequest, NextResponse } from 'next/server';
import { withOrganizationAuth } from '@/lib/organization-middleware';
import { db } from '@/db/db';
import { claims } from '@/db/schema/domains/claims';
import { and } from 'drizzle-orm';
import { ErrorCode } from '@/lib/api/standardized-responses';

async function handler(req: NextRequest, context) {
  const { organizationId } = context;
  const searchParams = req.nextUrl.searchParams;
  const daysBack = parseInt(searchParams.get('days') || '30');

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);

  // Identify bottlenecks by analyzing stage duration
  const bottlenecks = await withRLSContext(async (tx) => {
      return await tx.execute(sql`
    WITH stage_durations AS (
      SELECT
        ${claims.status} as stage,
        COUNT(*) as count,
        AVG(EXTRACT(EPOCH FROM (COALESCE(${claims.updatedAt}, NOW()) - ${claims.createdAt})) / 3600) as avg_duration,
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (COALESCE(${claims.updatedAt}, NOW()) - ${claims.createdAt})) / 3600) as p75_duration
      FROM ${claims}
      WHERE ${claims.organizationId} = ${organizationId}
        AND ${claims.incidentDate} >= ${startDate.toISOString()}::timestamp
      GROUP BY ${claims.status}
    )
    SELECT
      stage,
      count,
      avg_duration as "avgDuration",
      CASE
        WHEN avg_duration > p75_duration * 1.5 THEN 'high'
        WHEN avg_duration > p75_duration * 1.2 THEN 'medium'
        ELSE 'low'
      END as severity
    FROM stage_durations
    WHERE count >= 5
      AND avg_duration > 48
    ORDER BY avg_duration DESC
    LIMIT 10
  `);
    });

  return NextResponse.json(bottlenecks);
}

export const GET = withOrganizationAuth(handler);

