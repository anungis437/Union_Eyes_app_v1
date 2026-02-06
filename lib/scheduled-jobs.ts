/**
 * Scheduled Jobs Configuration for Analytics
 * 
 * Configures cron jobs and background tasks for analytics
 * 
 * Features:
 * - Daily aggregation updates
 * - Cache warming
 * - Metric pre-computation
 * - Performance monitoring
 * 
 * Created: November 15, 2025
 */

import { aggregationService } from '@/lib/analytics-aggregation';
import { warmAnalyticsCache, getAnalyticsCacheStats } from '@/lib/analytics-middleware';
import { db } from '@/db';
import { claims } from '@/db/schema/claims-schema';
import { sql } from 'drizzle-orm';

interface JobConfig {
  name: string;
  schedule: string; // Cron expression
  handler: () => Promise<void>;
  enabled: boolean;
}

/**
 * Daily aggregation job
 * Runs at 2 AM every day
 */
const dailyAggregationJob: JobConfig = {
  name: 'daily-aggregation',
  schedule: '0 2 * * *', // 2 AM daily
  handler: async () => {
    console.log('[CRON] Starting daily aggregation job...');
    try {
      await aggregationService.runDailyAggregations();
      console.log('[CRON] Daily aggregation completed successfully');
    } catch (error) {
      console.error('[CRON] Daily aggregation failed:', error);
      // TODO: Send alert to monitoring system
    }
  },
  enabled: true,
};

/**
 * Cache warming job
 * Runs every 30 minutes
 */
const cacheWarmingJob: JobConfig = {
  name: 'cache-warming',
  schedule: '*/30 * * * *', // Every 30 minutes
  handler: async () => {
    console.log('[CRON] Starting cache warming job...');
    try {
      // Get all active tenants
      const tenants = await db
        .selectDistinct({ tenantId: claims.organizationId })
        .from(claims);

      for (const { tenantId } of tenants) {
        await warmAnalyticsCache(tenantId);
      }

      console.log('[CRON] Cache warming completed for', tenants.length, 'tenants');
    } catch (error) {
      console.error('[CRON] Cache warming failed:', error);
    }
  },
  enabled: true,
};

/**
 * Cache statistics reporting job
 * Runs every hour
 */
const cacheStatsJob: JobConfig = {
  name: 'cache-stats',
  schedule: '0 * * * *', // Every hour
  handler: async () => {
    const stats = getAnalyticsCacheStats();
    console.log('[CRON] Cache Statistics:', {
      hits: stats.hits,
      misses: stats.misses,
      hitRate: `${(stats.hitRate * 100).toFixed(2)}%`,
      size: stats.size,
    });
    
    // TODO: Send to monitoring/metrics system
  },
  enabled: true,
};

/**
 * Database statistics update job
 * Runs at 3 AM every Sunday
 */
const dbStatsJob: JobConfig = {
  name: 'db-stats-update',
  schedule: '0 3 * * 0', // 3 AM every Sunday
  handler: async () => {
    console.log('[CRON] Starting database statistics update...');
    try {
      // Update PostgreSQL statistics for query planner
      await db.execute(sql`ANALYZE claims`);
      await db.execute(sql`ANALYZE members`);
      await db.execute(sql`ANALYZE claim_updates`);
      
      console.log('[CRON] Database statistics updated successfully');
    } catch (error) {
      console.error('[CRON] Database statistics update failed:', error);
    }
  },
  enabled: true,
};

/**
 * Materialized view refresh job
 * Runs at 1 AM daily
 */
const refreshMaterializedViewsJob: JobConfig = {
  name: 'refresh-materialized-views',
  schedule: '0 1 * * *', // 1 AM daily
  handler: async () => {
    console.log('[CRON] Starting materialized view refresh...');
    try {
      // Refresh daily analytics summary
      await db.execute(sql`REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_daily_summary`);
      console.log('[CRON] Refreshed analytics_daily_summary');

      // Refresh member analytics summary
      await db.execute(sql`REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_member_summary`);
      console.log('[CRON] Refreshed analytics_member_summary');

      console.log('[CRON] All materialized views refreshed successfully');
    } catch (error) {
      console.error('[CRON] Materialized view refresh failed:', error);
    }
  },
  enabled: true,
};

/**
 * Old cache cleanup job
 * Runs every 6 hours
 */
const cacheCleanupJob: JobConfig = {
  name: 'cache-cleanup',
  schedule: '0 */6 * * *', // Every 6 hours
  handler: async () => {
    console.log('[CRON] Running cache cleanup...');
    // The cache service automatically cleans up expired entries
    // This job is for logging and monitoring
    const stats = getAnalyticsCacheStats();
    console.log('[CRON] Cache cleanup complete. Current size:', stats.size);
  },
  enabled: true,
};

// All jobs configuration
export const analyticsJobs: JobConfig[] = [
  dailyAggregationJob,
  cacheWarmingJob,
  cacheStatsJob,
  dbStatsJob,
  refreshMaterializedViewsJob,
  cacheCleanupJob,
];

/**
 * Initialize scheduled jobs
 * Call this from your application startup
 */
export function initializeAnalyticsJobs() {
  console.log('Initializing analytics scheduled jobs...');
  
  const enabledJobs = analyticsJobs.filter(job => job.enabled);
  console.log(`Found ${enabledJobs.length} enabled jobs:`, 
    enabledJobs.map(j => j.name).join(', ')
  );

  // Integrate with node-cron for scheduled job execution
  if (typeof window === 'undefined') { // Server-side only
    const cron = require('node-cron');
    
    enabledJobs.forEach(job => {
      const task = cron.schedule(job.schedule, async () => {
        console.log(`[CRON] Starting job: ${job.name}`);
        try {
          await job.handler();
        } catch (error) {
          console.error(`[CRON] Job ${job.name} failed:`, error);
        }
      }, {
        scheduled: true,
        timezone: "America/Toronto" // Adjust based on your requirements
      });
      
      console.log(`✓ Scheduled ${job.name} with pattern ${job.schedule}`);
    });
  }

  return enabledJobs;
}

/**
 * Run a specific job manually (for testing/debugging)
 */
export async function runJobManually(jobName: string): Promise<void> {
  const job = analyticsJobs.find(j => j.name === jobName);
  if (!job) {
    throw new Error(`Job not found: ${jobName}`);
  }

  console.log(`Manually running job: ${jobName}`);
  await job.handler();
}

/**
 * Get job status
 */
export function getJobsStatus() {
  return analyticsJobs.map(job => ({
    name: job.name,
    schedule: job.schedule,
    enabled: job.enabled,
  }));
}
