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
import { db } from '@/db';
import { claims } from '@/db/schema';

/**
 * Version 1 Handler - Original API
 */
async function handleV1(request: NextRequest): Promise<NextResponse> {
  const claimsList = await db.select().from(claims).limit(20);

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
  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  const claimsList = await db.select().from(claims).limit(limit).offset(offset);

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
 * Export with versioning wrapper
 */
export const GET = withVersioning({
  v1: handleV1,
  v2: handleV2,
});
