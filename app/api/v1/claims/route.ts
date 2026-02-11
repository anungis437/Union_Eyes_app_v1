/**
 * Example: Versioned Claims API
 * 
 * Demonstrates how to implement versioned API endpoints
 * 
 * URL Examples:
 * - /api/v1/claims - Version 1 (current)
 * - /api/v2/claims - Version 2 (latest)
 * - /api/claims?version=1 - Query parameter
 * 
 * Header Examples:
 * - Accept: application/vnd.unioneyes.v1+json
 * - X-API-Version: v1
 */

import { NextRequest, NextResponse } from 'next/server';
import { withVersioning } from '@/lib/api-versioning/version-middleware';
import { withApiAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { db } from '@/db';
import { claims } from '@/db/schema';
import { withRLSContext } from '@/lib/db/with-rls-context';
import { eq } from 'drizzle-orm';

/**
 * Version 1 Handler - Original API
 */
async function handleV1(request: NextRequest): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user?.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const claimsList = await withRLSContext(
    { organizationId: user.organizationId },
    async (db) => db.select().from(claims).where(eq(claims.organizationId, user.organizationId)).limit(20)
  );

  // V1 response format
  return NextResponse.json({
    success: true,
    data: claimsList,
    count: claimsList.length,
  });
}

/**
 * Version 2 Handler - Improved API with pagination
 */
async function handleV2(request: NextRequest): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user?.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  const claimsList = await withRLSContext(
    { organizationId: user.organizationId },
    async (db) => db.select().from(claims).where(eq(claims.organizationId, user.organizationId)).limit(limit).offset(offset)
  );

  // V2 response format (improved)
  return NextResponse.json({
    data: claimsList,
    pagination: {
      page,
      limit,
      total: claimsList.length,
      hasMore: claimsList.length === limit,
    },
    meta: {
      version: 'v2',
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Export with versioning wrapper and authentication
 */
const versionedHandler = withVersioning({
  v1: handleV1,
  v2: handleV2,
});

export const GET = withApiAuth(versionedHandler);

