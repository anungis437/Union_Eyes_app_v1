import { NextRequest, NextResponse } from 'next/server';
import { withTenantAuth } from '@/lib/tenant-middleware';
import { db } from '@/db/db';
import { claims } from '@/db/schema/claims-schema';
import { eq, and, sql } from 'drizzle-orm';

async function handler(req: NextRequest) {
  const tenantId = (req as any).tenantId;

  // Get queue metrics by priority
  const queues = await db.execute(sql`
    SELECT 
      ${claims.priority} as priority,
      COUNT(*) as count,
      COALESCE(AVG(EXTRACT(EPOCH FROM (NOW() - ${claims.createdAt})) / 3600), 0) as "avgAge",
      COALESCE(MAX(EXTRACT(EPOCH FROM (NOW() - ${claims.createdAt})) / 3600), 0) as oldest
    FROM ${claims}
    WHERE ${claims.tenantId} = ${tenantId}
      AND ${claims.status} IN ('under_review', 'assigned', 'investigation', 'pending_documentation')
    GROUP BY ${claims.priority}
    ORDER BY 
      CASE ${claims.priority}
        WHEN 'critical' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
        WHEN 'low' THEN 4
      END
  `);

  return NextResponse.json(queues);
}

export const GET = withTenantAuth(handler);
