/**
 * Cleanup Worker - Processes maintenance and cleanup jobs
 * 
 * Handles periodic cleanup of old data, logs, and temporary files
 */

import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { CleanupJobData } from '../job-queue';
import { db } from '@/db';
import { activityLogs, notificationHistory } from '@/db/schema';
import { lt } from 'drizzle-orm';
import fs from 'fs/promises';
import path from 'path';

const connection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
});

const REPORTS_DIR = process.env.REPORTS_DIR || './reports';
const TEMP_DIR = process.env.TEMP_DIR || './temp';

/**
 * Clean up old activity logs
 */
async function cleanupLogs(olderThanDays: number) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

  console.log(`Cleaning up activity logs older than ${cutoffDate.toISOString()}`);

  const result = await db
    .delete(activityLogs)
    .where(lt(activityLogs.createdAt, cutoffDate));

  console.log(`Deleted old activity logs`);

  return { deleted: result.rowsAffected || 0 };
}

/**
 * Clean up old notification history
 */
async function cleanupNotificationHistory(olderThanDays: number) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

  console.log(`Cleaning up notification history older than ${cutoffDate.toISOString()}`);

  const result = await db
    .delete(notificationHistory)
    .where(lt(notificationHistory.sentAt, cutoffDate));

  console.log(`Deleted old notification history`);

  return { deleted: result.rowsAffected || 0 };
}

/**
 * Clean up old sessions
 */
async function cleanupSessions() {
  console.log('Cleaning up expired sessions');

  // TODO: Implement session cleanup
  // This depends on your session storage mechanism
  // For Clerk, sessions are managed automatically

  return { deleted: 0 };
}

/**
 * Clean up temporary files
 */
async function cleanupTempFiles(olderThanDays: number) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
  const cutoffTime = cutoffDate.getTime();

  console.log(`Cleaning up temporary files older than ${cutoffDate.toISOString()}`);

  let deleted = 0;

  try {
    const files = await fs.readdir(TEMP_DIR);

    for (const file of files) {
      const filepath = path.join(TEMP_DIR, file);
      const stats = await fs.stat(filepath);

      if (stats.mtimeMs < cutoffTime) {
        await fs.unlink(filepath);
        deleted++;
      }
    }
  } catch (error) {
    console.error('Error cleaning up temp files:', error);
  }

  console.log(`Deleted ${deleted} temporary files`);

  return { deleted };
}

/**
 * Clean up old exported reports
 */
async function cleanupExports(olderThanDays: number) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
  const cutoffTime = cutoffDate.getTime();

  console.log(`Cleaning up exported reports older than ${cutoffDate.toISOString()}`);

  let deleted = 0;

  try {
    const files = await fs.readdir(REPORTS_DIR);

    for (const file of files) {
      const filepath = path.join(REPORTS_DIR, file);
      const stats = await fs.stat(filepath);

      if (stats.mtimeMs < cutoffTime) {
        await fs.unlink(filepath);
        deleted++;
      }
    }
  } catch (error) {
    console.error('Error cleaning up exports:', error);
  }

  console.log(`Deleted ${deleted} exported reports`);

  return { deleted };
}

/**
 * Process cleanup job
 */
async function processCleanupJob(job: Job<CleanupJobData>) {
  const { target, olderThanDays } = job.data;

  console.log(`Processing cleanup job ${job.id}: ${target} (${olderThanDays} days)`);

  await job.updateProgress(10);

  let result;

  switch (target) {
    case 'logs':
      result = await cleanupLogs(olderThanDays);
      break;

    case 'sessions':
      result = await cleanupSessions();
      break;

    case 'temp-files':
      result = await cleanupTempFiles(olderThanDays);
      break;

    case 'exports':
      result = await cleanupExports(olderThanDays);
      break;

    default:
      throw new Error(`Unknown cleanup target: ${target}`);
  }

  await job.updateProgress(100);

  console.log(`Cleanup completed for ${target}:`, result);

  return {
    success: true,
    target,
    ...result,
  };
}

// Create worker
export const cleanupWorker = new Worker(
  'cleanup',
  async (job: Job<CleanupJobData>) => {
    return await processCleanupJob(job);
  },
  {
    connection,
    concurrency: 1, // Run cleanup jobs sequentially
  }
);

// Event handlers
cleanupWorker.on('completed', (job) => {
  console.log(`Cleanup job ${job.id} completed`);
});

cleanupWorker.on('failed', (job, err) => {
  console.error(`Cleanup job ${job?.id} failed:`, err.message);
});

cleanupWorker.on('error', (err) => {
  console.error('Cleanup worker error:', err);
});

// Graceful shutdown
async function shutdown() {
  console.log('Shutting down cleanup worker...');
  await cleanupWorker.close();
  await connection.quit();
  console.log('Cleanup worker stopped');
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
