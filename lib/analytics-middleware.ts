/**
 * Analytics Middleware
 * 
 * Integrates caching and aggregation services with analytics APIs
 * Provides wrapper functions for common analytics operations
 * 
 * Created: November 15, 2025
 */

import { NextRequest, NextResponse } from 'next/server';
import { withCache, analyticsCache } from './analytics-cache';
import { aggregationService } from './analytics-aggregation';

/**
 * Enhanced analytics handler with automatic caching
 */
export function withAnalyticsCache<T>(
  endpoint: string,
  handler: (req: NextRequest, tenantId: string, params: any) => Promise<T>,
  ttl: number = 5 * 60 * 1000 // 5 minutes default
) {
  return async (req: NextRequest) => {
    const tenantId = (req as any).tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Extract query parameters
    const searchParams = req.nextUrl.searchParams;
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });

    try {
      // Try cache first
      const data = await withCache(
        tenantId,
        endpoint,
        params,
        () => handler(req, tenantId, params),
        ttl
      );

      return NextResponse.json(data);
    } catch (error) {
      console.error(`Error in ${endpoint}:`, error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

/**
 * Webhook handler to invalidate cache when data changes
 */
export async function handleDataChange(
  tenantId: string,
  changeType: 'claim_created' | 'claim_updated' | 'claim_deleted' | 'member_updated'
): Promise<void> {
  // Invalidate relevant caches based on change type
  switch (changeType) {
    case 'claim_created':
    case 'claim_updated':
    case 'claim_deleted':
      // Invalidate all claims, financial, and operational analytics
      analyticsCache.invalidate(tenantId, 'claims');
      analyticsCache.invalidate(tenantId, 'financial');
      analyticsCache.invalidate(tenantId, 'operational');
      break;
    
    case 'member_updated':
      // Invalidate member analytics
      analyticsCache.invalidate(tenantId, 'members');
      break;
  }

  console.log(`Cache invalidated for tenant ${tenantId} (${changeType})`);
}

/**
 * Get analytics dashboard summary with caching
 */
export async function getAnalyticsDashboard(tenantId: string) {
  return await withCache(
    tenantId,
    'dashboard',
    {},
    async () => {
      return await aggregationService.computeTenantMetrics(tenantId);
    },
    2 * 60 * 1000 // 2 minutes TTL for dashboard
  );
}

/**
 * Cache warming utility - pre-populate cache with common queries
 */
export async function warmAnalyticsCache(tenantId: string): Promise<void> {
  console.log(`Warming cache for tenant ${tenantId}...`);

  const commonTimeRanges = [7, 30, 90];
  
  try {
    // Warm up dashboard cache
    await getAnalyticsDashboard(tenantId);

    // Can add more cache warming for specific endpoints
    console.log(`Cache warmed for tenant ${tenantId}`);
  } catch (error) {
    console.error(`Error warming cache for tenant ${tenantId}:`, error);
  }
}

/**
 * Get cache statistics for monitoring
 */
export function getAnalyticsCacheStats() {
  return analyticsCache.getStats();
}

/**
 * Manual cache clear (for admin purposes)
 */
export function clearAnalyticsCache(tenantId?: string) {
  if (tenantId) {
    analyticsCache.invalidate(tenantId);
  } else {
    analyticsCache.clear();
  }
}
