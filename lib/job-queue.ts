/**
 * Job Queue Infrastructure using BullMQ
 * 
 * Provides reliable background job processing with Redis backend
 * Features: retries, priorities, scheduling, monitoring
 * 
 * Created: November 15, 2025
 */

import { Queue, Worker, QueueEvents, Job } from 'bullmq';
import IORedis from 'ioredis';

// Redis connection configuration
const connection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
});

// Job type definitions
export interface EmailJobData {
  type: 'email';
  to: string | string[];
  subject: string;
  template: string;
  data: Record<string, any>;
  priority?: number;
}

export interface SmsJobData {
  type: 'sms';
  to: string;
  message: string;
  priority?: number;
}

export interface NotificationJobData {
  type: 'notification';
  userId: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  channels: ('email' | 'sms' | 'push' | 'in-app')[];
}

export interface ReportJobData {
  type: 'report';
  reportType: string;
  tenantId: string;
  userId: string;
  parameters: Record<string, any>;
}

export interface CleanupJobData {
  type: 'cleanup';
  target: 'logs' | 'sessions' | 'temp-files' | 'exports';
  olderThanDays: number;
}

export type JobData = 
  | EmailJobData 
  | SmsJobData 
  | NotificationJobData 
  | ReportJobData 
  | CleanupJobData;

// ============================================
// Queue Definitions
// ============================================

export const emailQueue = new Queue<EmailJobData>('email', { connection });
export const smsQueue = new Queue<SmsJobData>('sms', { connection });
export const notificationQueue = new Queue<NotificationJobData>('notifications', { connection });
export const reportQueue = new Queue<ReportJobData>('reports', { connection });
export const cleanupQueue = new Queue<CleanupJobData>('cleanup', { connection });

// Queue events for monitoring
export const emailQueueEvents = new QueueEvents('email', { connection });
export const smsQueueEvents = new QueueEvents('sms', { connection });
export const notificationQueueEvents = new QueueEvents('notifications', { connection });
export const reportQueueEvents = new QueueEvents('reports', { connection });
export const cleanupQueueEvents = new QueueEvents('cleanup', { connection });

// ============================================
// Job Helpers
// ============================================

/**
 * Add email job to queue
 */
export async function addEmailJob(
  data: Omit<EmailJobData, 'type'>,
  options?: {
    delay?: number;
    priority?: number;
    attempts?: number;
  }
) {
  return await emailQueue.add(
    'send-email',
    { type: 'email', ...data },
    {
      priority: options?.priority || data.priority || 5,
      attempts: options?.attempts || 3,
      delay: options?.delay,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: {
        count: 1000,
      },
      removeOnFail: {
        count: 5000,
      },
    }
  );
}

/**
 * Add SMS job to queue
 */
export async function addSmsJob(
  data: Omit<SmsJobData, 'type'>,
  options?: {
    delay?: number;
    priority?: number;
    attempts?: number;
  }
) {
  return await smsQueue.add(
    'send-sms',
    { type: 'sms', ...data },
    {
      priority: options?.priority || data.priority || 3,
      attempts: options?.attempts || 2,
      delay: options?.delay,
      backoff: {
        type: 'exponential',
        delay: 3000,
      },
    }
  );
}

/**
 * Add notification job (multi-channel)
 */
export async function addNotificationJob(
  data: Omit<NotificationJobData, 'type'>,
  options?: {
    delay?: number;
    priority?: number;
  }
) {
  return await notificationQueue.add(
    'send-notification',
    { type: 'notification', ...data },
    {
      priority: options?.priority || 5,
      attempts: 3,
      delay: options?.delay,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    }
  );
}

/**
 * Add report generation job
 */
export async function addReportJob(
  data: Omit<ReportJobData, 'type'>,
  options?: {
    priority?: number;
  }
) {
  return await reportQueue.add(
    'generate-report',
    { type: 'report', ...data },
    {
      priority: options?.priority || 5,
      attempts: 2,
      timeout: 300000, // 5 minutes
      backoff: {
        type: 'fixed',
        delay: 10000,
      },
    }
  );
}

/**
 * Add cleanup job
 */
export async function addCleanupJob(
  data: Omit<CleanupJobData, 'type'>,
  options?: {
    delay?: number;
  }
) {
  return await cleanupQueue.add(
    'cleanup',
    { type: 'cleanup', ...data },
    {
      priority: 10, // Low priority
      attempts: 1,
      delay: options?.delay,
    }
  );
}

/**
 * Schedule recurring email digest job
 */
export async function scheduleEmailDigest(
  frequency: 'daily' | 'weekly',
  hour: number = 8
) {
  const pattern = frequency === 'daily' 
    ? `0 ${hour} * * *`  // Daily at specified hour
    : `0 ${hour} * * 1`; // Weekly on Monday at specified hour

  return await emailQueue.add(
    'email-digest',
    {
      type: 'email',
      to: [], // Will be populated by processor
      subject: `${frequency === 'daily' ? 'Daily' : 'Weekly'} Digest`,
      template: 'digest',
      data: { frequency },
    },
    {
      repeat: {
        pattern,
      },
    }
  );
}

/**
 * Schedule cleanup jobs
 */
export async function scheduleCleanupJobs() {
  // Daily cleanup at 2 AM
  await cleanupQueue.add(
    'cleanup-logs',
    {
      type: 'cleanup',
      target: 'logs',
      olderThanDays: 30,
    },
    {
      repeat: {
        pattern: '0 2 * * *',
      },
    }
  );

  // Weekly cleanup on Sunday at 3 AM
  await cleanupQueue.add(
    'cleanup-exports',
    {
      type: 'cleanup',
      target: 'exports',
      olderThanDays: 7,
    },
    {
      repeat: {
        pattern: '0 3 * * 0',
      },
    }
  );
}

// ============================================
// Queue Monitoring
// ============================================

export interface QueueStats {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
}

/**
 * Get statistics for all queues
 */
export async function getAllQueueStats(): Promise<QueueStats[]> {
  const queues = [
    emailQueue,
    smsQueue,
    notificationQueue,
    reportQueue,
    cleanupQueue,
  ];

  const stats = await Promise.all(
    queues.map(async (queue) => {
      const counts = await queue.getJobCounts();
      const isPaused = await queue.isPaused();

      return {
        name: queue.name,
        waiting: counts.waiting || 0,
        active: counts.active || 0,
        completed: counts.completed || 0,
        failed: counts.failed || 0,
        delayed: counts.delayed || 0,
        paused: isPaused,
      };
    })
  );

  return stats;
}

/**
 * Get failed jobs for a queue
 */
export async function getFailedJobs(queueName: string, limit: number = 10) {
  let queue: Queue;
  
  switch (queueName) {
    case 'email':
      queue = emailQueue;
      break;
    case 'sms':
      queue = smsQueue;
      break;
    case 'notifications':
      queue = notificationQueue;
      break;
    case 'reports':
      queue = reportQueue;
      break;
    case 'cleanup':
      queue = cleanupQueue;
      break;
    default:
      throw new Error(`Unknown queue: ${queueName}`);
  }

  return await queue.getFailed(0, limit);
}

/**
 * Retry failed job
 */
export async function retryJob(queueName: string, jobId: string) {
  const jobs = await getFailedJobs(queueName, 100);
  const job = jobs.find((j) => j.id === jobId);
  
  if (!job) {
    throw new Error(`Job ${jobId} not found in ${queueName} queue`);
  }

  await job.retry();
}

/**
 * Clean completed jobs
 */
export async function cleanCompletedJobs(
  queueName: string,
  olderThanMs: number = 24 * 60 * 60 * 1000 // 24 hours
) {
  let queue: Queue;
  
  switch (queueName) {
    case 'email':
      queue = emailQueue;
      break;
    case 'sms':
      queue = smsQueue;
      break;
    case 'notifications':
      queue = notificationQueue;
      break;
    case 'reports':
      queue = reportQueue;
      break;
    case 'cleanup':
      queue = cleanupQueue;
      break;
    default:
      throw new Error(`Unknown queue: ${queueName}`);
  }

  await queue.clean(olderThanMs, 100, 'completed');
  await queue.clean(olderThanMs * 7, 100, 'failed'); // Keep failed longer
}

/**
 * Pause queue
 */
export async function pauseQueue(queueName: string) {
  const queues: Record<string, Queue> = {
    email: emailQueue,
    sms: smsQueue,
    notifications: notificationQueue,
    reports: reportQueue,
    cleanup: cleanupQueue,
  };

  const queue = queues[queueName];
  if (!queue) {
    throw new Error(`Unknown queue: ${queueName}`);
  }

  await queue.pause();
}

/**
 * Resume queue
 */
export async function resumeQueue(queueName: string) {
  const queues: Record<string, Queue> = {
    email: emailQueue,
    sms: smsQueue,
    notifications: notificationQueue,
    reports: reportQueue,
    cleanup: cleanupQueue,
  };

  const queue = queues[queueName];
  if (!queue) {
    throw new Error(`Unknown queue: ${queueName}`);
  }

  await queue.resume();
}

// ============================================
// Graceful Shutdown
// ============================================

export async function closeQueues() {
  console.log('Closing job queues...');
  
  await Promise.all([
    emailQueue.close(),
    smsQueue.close(),
    notificationQueue.close(),
    reportQueue.close(),
    cleanupQueue.close(),
    emailQueueEvents.close(),
    smsQueueEvents.close(),
    notificationQueueEvents.close(),
    reportQueueEvents.close(),
    cleanupQueueEvents.close(),
    connection.quit(),
  ]);

  console.log('All queues closed');
}

// Register shutdown handlers
process.on('SIGTERM', closeQueues);
process.on('SIGINT', closeQueues);
