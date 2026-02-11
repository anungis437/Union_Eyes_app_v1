/**
 * Prometheus Metrics Endpoint
 * 
 * GET /api/metrics
 * 
 * Returns application metrics in Prometheus exposition format.
 * This endpoint should be scraped by Prometheus or compatible monitoring systems.
 * 
 * Security: 
 * - Protected by METRICS_AUTH_TOKEN in production
 * - No authentication in development
 * - Should be exposed internally only (not public internet)
 * 
 * Usage:
 * ```bash
 * # Without authentication (dev)
 * curl http://localhost:3000/api/metrics
 * 
 * # With authentication (prod)
 * curl -H "Authorization: Bearer YOUR_TOKEN" https://api.unioneyes.com/api/metrics
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMetrics, getMetricsContentType, dbConnectionsActive, dbConnectionsIdle, dbConnectionsMax } from '@/lib/observability/metrics';
import { db } from '@/db/db';
import { sql } from 'drizzle-orm';
import { standardErrorResponse, ErrorCode } from '@/lib/api/standardized-responses';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Authenticate metrics requests
 */
function authenticateRequest(request: NextRequest): boolean {
  // No auth in development
  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  const authToken = process.env.METRICS_AUTH_TOKEN;
  
  // If no token configured, allow in non-production
  if (!authToken && process.env.NODE_ENV !== 'production') {
    return true;
  }

  // Require auth in production
  if (!authToken) {
return false;
  }

  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  return token === authToken;
}

/**
 * Update database connection pool metrics
 */
async function updateDatabaseMetrics(): Promise<void> {
  try {
    const result = await db.execute(sql`
      SELECT 
        (SELECT count(*) FROM pg_stat_activity WHERE datname = current_database()) as active_connections,
        (SELECT count(*) FROM pg_stat_activity WHERE datname = current_database() AND state = 'idle') as idle_connections,
        (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') as max_connections
    `);

    const stats = result[0];
    
    if (stats) {
      dbConnectionsActive.set(Number(stats.active_connections || 0));
      dbConnectionsIdle.set(Number(stats.idle_connections || 0));
      dbConnectionsMax.set(Number(stats.max_connections || 100));
    }
  } catch (error) {
// Don't fail the whole endpoint if DB metrics fail
  }
}

/**
 * GET /api/metrics
 * 
 * Returns Prometheus metrics
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  // Authenticate request
  if (!authenticateRequest(request)) {
    return new NextResponse('Unauthorized', { 
      status: 401,
      headers: { 'WWW-Authenticate': 'Bearer' }
    });
  }

  try {
    // Update real-time metrics before returning
    await updateDatabaseMetrics();

    // Get metrics in Prometheus format
    const metrics = await getMetrics();
    
    return new NextResponse(metrics, {
      status: 200,
      headers: {
        'Content-Type': getMetricsContentType(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
return new NextResponse('Internal Server Error', { 
      status: 500,
    });
  }
}

