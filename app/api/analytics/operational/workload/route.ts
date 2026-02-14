import { withRLSContext } from '@/lib/db/with-rls-context';
import { NextRequest, NextResponse } from 'next/server';
import { withApiAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { db } from '@/db/db';
import { claims, users } from '@/db/schema';
import { and } from 'drizzle-orm';

import { standardSuccessResponse } from '@/lib/api/standardized-responses';
async function handler(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) {
    return standardErrorResponse(
      ErrorCode.AUTH_REQUIRED,
      'Authentication and organization context required'
    );
  }
  
  const organizationId = user.organizationId;
  const searchParams = req.nextUrl.searchParams;
  const daysBack = parseInt(searchParams.get('days') || '30');

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);

  // Get steward workload with response times
  const workload = await withRLSContext(async (tx) => {
      return await tx.execute(sql`
    SELECT 
      u.id as "stewardId",
      u.name as "stewardName",
      COUNT(CASE WHEN c.status IN ('under_review', 'assigned', 'investigation', 'pending_documentation') THEN 1 END) as "activeCases",
      20 as capacity,
      (COUNT(CASE WHEN c.status IN ('under_review', 'assigned', 'investigation', 'pending_documentation') THEN 1 END)::float / 20 * 100) as utilization,
      COALESCE(AVG(
        CASE WHEN cu.created_at > c.created_at 
        THEN EXTRACT(EPOCH FROM (cu.created_at - c.created_at)) / 3600 
        END
      ), 0) as "avgResponseTime"
    FROM ${users} u
    LEFT JOIN ${claims} c ON u.id = c.assigned_to 
      AND c.organization_id = ${organizationId}
      AND c.incident_date >= ${startDate.toISOString()}::timestamp
    LEFT JOIN claim_updates cu ON c.claim_id = cu.claim_id
      AND cu.update_type = 'status_change'
      AND cu.created_at = (
        SELECT MIN(created_at) 
        FROM claim_updates 
        WHERE claim_id = c.claim_id
      )
    WHERE u.organization_id = ${organizationId}
      AND u.role = 'steward'
    GROUP BY u.id, u.name
    ORDER BY "activeCases" DESC
  `);
    });

  return NextResponse.json(workload);
}

export const GET = withApiAuth(handler);

