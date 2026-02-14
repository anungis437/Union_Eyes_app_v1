/**
 * Job Queue Infrastructure using BullMQ
 * 
 * Provides reliable background job processing with Redis backend
 * Features: retries, priorities, scheduling, monitoring
 * 
 * Created: November 15, 2025
 */

// Avoid importing bullmq types at module level to prevent bundling
// Types are documented in JSDoc only

// Don&apos;t lazy-load at module level - only on first function call
let _initialized = false;
let QueueImpl: unknown, WorkerImpl: unknown, QueueEventsImpl: unknown, JobImpl: unknown;
let IORedisImpl: unknown;

const ensureInitialized = () => {
  // Only initialize once, and only in valid Node.js environments
  if (_initialized || typeof window !== 'undefined') {
    return;
  }
  
  _initialized = true;
  
  try {
    // Use require with string variable to prevent bundler from recognizing bullmq import
     
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const bullmq = require('bull' + 'mq');
    QueueImpl = bullmq.Queue;
    WorkerImpl = bullmq.Worker;
    QueueEventsImpl = bullmq.QueueEvents;
    JobImpl = bullmq.Job;
     
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    IORedisImpl = require('io' + 'redis');
  } catch (e: unknown) {
    // Silently fail if bullmq not available or if we&apos;re in a build/bundling context
    // This handles "self is not defined" and other bundler-related errors
    // The require() calls above may fail during Next.js build phase or in restricted environments
  }
};

// Redis connection configuration (lazy loaded)
let connection: unknown;

const getConnection = () => {
  if (!connection && IORedisImpl) {
    connection = new IORedisImpl({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      maxRetriesPerRequest: null,
    });
  }
  return connection;
};

// Job type definitions
export interface EmailJobData {
  type: 'email';
  to: string | string[];
  subject: string;
  template: string;
  data: Record<string, unknown>;
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
  data?: Record<string, unknown>;
  channels: ('email' | 'sms' | 'push' | 'in-app')[];
}

export interface ReportJobData {
  type: 'report';
  reportType: string;
  tenantId: string;
  userId: string;
  parameters: Record<string, unknown>;
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
// Queue Definitions (Lazy-loaded)
// ============================================

let emailQueue: unknown = null;
let smsQueue: unknown = null;
let notificationQueue: unknown = null;
let reportQueue: unknown = null;
let cleanupQueue: unknown = null;

let emailQueueEvents: unknown = null;
let smsQueueEvents: unknown = null;
let notificationQueueEvents: unknown = null;
let reportQueueEvents: unknown = null;
let cleanupQueueEvents: unknown = null;

export const getEmailQueue = () => {
  ensureInitialized();
  if (!emailQueue && QueueImpl) {
    emailQueue = new QueueImpl('email', { connection: getConnection() });
  }
  return emailQueue;
};

export const getSmsQueue = () => {
  ensureInitialized();
  if (!smsQueue && QueueImpl) {
    smsQueue = new QueueImpl('sms', { connection: getConnection() });
  }
  return smsQueue;
};

export const getNotificationQueue = () => {
  ensureInitialized();
  if (!notificationQueue && QueueImpl) {
    notificationQueue = new QueueImpl('notifications', { connection: getConnection() });
  }
  return notificationQueue;
};

export const getReportQueue = () => {
  ensureInitialized();
  if (!reportQueue && QueueImpl) {
    reportQueue = new QueueImpl('reports', { connection: getConnection() });
  }
  return reportQueue;
};

export const getCleanupQueue = () => {
  ensureInitialized();
  if (!cleanupQueue && QueueImpl) {
    cleanupQueue = new QueueImpl('cleanup', { connection: getConnection() });
  }
  return cleanupQueue;
};

export const getEmailQueueEvents = () => {
  ensureInitialized();
  if (!emailQueueEvents && QueueEventsImpl) {
    emailQueueEvents = new QueueEventsImpl('email', { connection: getConnection() });
  }
  return emailQueueEvents;
};

export const getSmsQueueEvents = () => {
  ensureInitialized();
  if (!smsQueueEvents && QueueEventsImpl) {
    smsQueueEvents = new QueueEventsImpl('sms', { connection: getConnection() });
  }
  return smsQueueEvents;
};

export const getNotificationQueueEvents = () => {
  ensureInitialized();
  if (!notificationQueueEvents && QueueEventsImpl) {
    notificationQueueEvents = new QueueEventsImpl('notifications', { connection: getConnection() });
  }
  return notificationQueueEvents;
};

export const getReportQueueEvents = () => {
  ensureInitialized();
  if (!reportQueueEvents && QueueEventsImpl) {
    reportQueueEvents = new QueueEventsImpl('reports', { connection: getConnection() });
  }
  return reportQueueEvents;
};

export const getCleanupQueueEvents = () => {
  ensureInitialized();
  if (!cleanupQueueEvents && QueueEventsImpl) {
    cleanupQueueEvents = new QueueEventsImpl('cleanup', { connection: getConnection() });
  }
  return cleanupQueueEvents;
};

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
  ensureInitialized();
  const queue = getEmailQueue();
  if (!queue) throw new Error('Email queue not available');
  return await queue.add(
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
  const queue = getSmsQueue();
  if (!queue) throw new Error('SMS queue not available');
  return await queue.add(
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
  const queue = getNotificationQueue();
  if (!queue) throw new Error('Notification queue not available');
  return await queue.add(
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
  const queue = getReportQueue();
  if (!queue) throw new Error('Report queue not available');
  return await queue.add(
    'generate-report',
    { type: 'report', ...data },
    {
      priority: options?.priority || 5,
      attempts: 2,
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
  const queue = getCleanupQueue();
  if (!queue) throw new Error('Cleanup queue not available');
  return await queue.add(
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
  const queue = getEmailQueue();
  if (!queue) throw new Error('Email queue not available');
  const pattern = frequency === 'daily' 
    ? `0 ${hour} * * *`  // Daily at specified hour
    : `0 ${hour} * * 1`; // Weekly on Monday at specified hour

  return await queue.add(
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
  const queue = getCleanupQueue();
  if (!queue) throw new Error('Cleanup queue not available');
  
  // Daily cleanup at 2 AM
  await queue.add(
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
  await queue.add(
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
    getEmailQueue(),
    getSmsQueue(),
    getNotificationQueue(),
    getReportQueue(),
    getCleanupQueue(),
  ].filter(q => q !== null) as unknown[];

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
  let queue: unknown | null;
  
  switch (queueName) {
    case 'email':
      queue = getEmailQueue();
      break;
    case 'sms':
      queue = getSmsQueue();
      break;
    case 'notifications':
      queue = getNotificationQueue();
      break;
    case 'reports':
      queue = getReportQueue();
      break;
    case 'cleanup':
      queue = getCleanupQueue();
      break;
    default:
      throw new Error(`Unknown queue: ${queueName}`);
  }

  if (!queue) throw new Error(`Queue ${queueName} not available`);
  return await queue.getFailed(0, limit);
}

/**
 * Retry failed job
 */
export async function retryJob(queueName: string, jobId: string) {
  const jobs = await getFailedJobs(queueName, 100);
  const job = jobs.find((j: unknown) => j.id === jobId);
  
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
  let queue: unknown | null;
  
  switch (queueName) {
    case 'email':
      queue = getEmailQueue();
      break;
    case 'sms':
      queue = getSmsQueue();
      break;
    case 'notifications':
      queue = getNotificationQueue();
      break;
    case 'reports':
      queue = getReportQueue();
      break;
    case 'cleanup':
      queue = getCleanupQueue();
      break;
    default:
      throw new Error(`Unknown queue: ${queueName}`);
  }

  if (!queue) throw new Error(`Queue ${queueName} not available`);
  await queue.clean(olderThanMs, 100, 'completed');
  await queue.clean(olderThanMs * 7, 100, 'failed'); // Keep failed longer
}

/**
 * Pause queue
 */
export async function pauseQueue(queueName: string) {
  let queue: unknown | null;
  
  switch (queueName) {
    case 'email':
      queue = getEmailQueue();
      break;
    case 'sms':
      queue = getSmsQueue();
      break;
    case 'notifications':
      queue = getNotificationQueue();
      break;
    case 'reports':
      queue = getReportQueue();
      break;
    case 'cleanup':
      queue = getCleanupQueue();
      break;
    default:
      throw new Error(`Unknown queue: ${queueName}`);
  }

  if (!queue) throw new Error(`Queue ${queueName} not available`);
  await queue.pause();
}

/**
 * Resume queue
 */
export async function resumeQueue(queueName: string) {
  let queue: unknown | null;
  
  switch (queueName) {
    case 'email':
      queue = getEmailQueue();
      break;
    case 'sms':
      queue = getSmsQueue();
      break;
    case 'notifications':
      queue = getNotificationQueue();
      break;
    case 'reports':
      queue = getReportQueue();
      break;
    case 'cleanup':
      queue = getCleanupQueue();
      break;
    default:
      throw new Error(`Unknown queue: ${queueName}`);
  }

  if (!queue) throw new Error(`Queue ${queueName} not available`);
  await queue.resume();
}

// ============================================
// Graceful Shutdown
// ============================================

export async function closeQueues() {
const conn = getConnection();
  await Promise.all([
    getEmailQueue()?.close(),
    getSmsQueue()?.close(),
    getNotificationQueue()?.close(),
    getReportQueue()?.close(),
    getCleanupQueue()?.close(),
    getEmailQueueEvents()?.close(),
    getSmsQueueEvents()?.close(),
    getNotificationQueueEvents()?.close(),
    getReportQueueEvents()?.close(),
    getCleanupQueueEvents()?.close(),
    conn?.quit(),
  ].filter(Boolean));
}

// Register shutdown handlers
process.on('SIGTERM', closeQueues);
process.on('SIGINT', closeQueues);

