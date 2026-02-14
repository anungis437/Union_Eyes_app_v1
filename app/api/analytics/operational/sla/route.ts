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

  // Get daily SLA metrics (using closedAt as completion time)
  const slaMetrics = await withRLSContext(async (tx) => {
      return await tx.execute(sql`
    WITH date_series AS (
      SELECT generate_series(
        date_trunc('day', ${startDate.toISOString()}::timestamp),
        date_trunc('day', NOW()),
        '1 day'::interval
      ) AS date
    ),
    daily_sla AS (
      SELECT
        date_trunc('day', ${claims.closedAt}) as date,
        COUNT(CASE WHEN EXTRACT(EPOCH FROM (${claims.closedAt} - ${claims.createdAt})) / 86400 <= 30 THEN 1 END) as "onTime",
        COUNT(CASE WHEN EXTRACT(EPOCH FROM (${claims.closedAt} - ${claims.createdAt})) / 86400 > 30 THEN 1 END) as overdue
      FROM ${claims}
      WHERE ${claims.organizationId} = ${organizationId}
        AND ${claims.status} = 'resolved'
        AND ${claims.closedAt} >= ${startDate.toISOString()}::timestamp
      GROUP BY date_trunc('day', ${claims.closedAt})
    )
    SELECT
      TO_CHAR(ds.date, 'YYYY-MM-DD') as date,
      COALESCE(sla."onTime", 0) as "onTime",
      COALESCE(sla.overdue, 0) as overdue,
      CASE 
        WHEN COALESCE(sla."onTime", 0) + COALESCE(sla.overdue, 0) > 0
        THEN (COALESCE(sla."onTime", 0)::float / (COALESCE(sla."onTime", 0) + COALESCE(sla.overdue, 0)) * 100)
        ELSE 100
      END as compliance
    FROM date_series ds
    LEFT JOIN daily_sla sla ON ds.date = sla.date
    ORDER BY ds.date
  `);
    });

  return NextResponse.json(slaMetrics);
}

export const GET = withOrganizationAuth(handler);

