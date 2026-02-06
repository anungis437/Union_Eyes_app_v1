/**
 * Notification Worker - Processes multi-channel notifications
 * 
 * Dispatches notifications across email, SMS, push, and in-app channels
 * based on user preferences
 */

// Only import bullmq in runtime, not during build
let Worker: any, Job: any, IORedis: any;

if (typeof window === 'undefined' && !process.env.__NEXT_BUILDING) {
  try {
    const bullmq = require('bullmq');
    Worker = bullmq.Worker;
    Job = bullmq.Job;
    IORedis = require('ioredis');
  } catch (e) {
    // Fail silently during build
  }
}

import { NotificationJobData } from '../job-queue';
import { addEmailJob } from '../job-queue';
import { addSmsJob } from '../job-queue';
import { db } from '@/db/db';
import { notificationHistory, userNotificationPreferences, inAppNotifications } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// Validate Redis configuration (deferred until actual use)
let connection: IORedis | null = null;

function getRedisConnection(): IORedis {
  if (connection) return connection;
  
  if (!process.env.REDIS_HOST) {
    throw new Error('REDIS_HOST is not configured. Set environment variable before starting notification worker.');
  }

  if (!process.env.REDIS_PORT) {
    throw new Error('REDIS_PORT is not configured. Set environment variable before starting notification worker.');
  }

  connection = new IORedis({
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT),
    maxRetriesPerRequest: null,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  });
  
  return connection;
}

/**
 * Get user's notification preferences
 */
async function getUserPreferences(userId: string) {
  const preferences = await db.query.userNotificationPreferences.findFirst({
    where: eq(userNotificationPreferences.userId, userId),
  });

  // Return defaults if not found
  return preferences || {
    userId,
    emailEnabled: true,
    smsEnabled: false,
    pushEnabled: true,
    inAppEnabled: true,
    digestFrequency: 'daily',
    quietHoursStart: null,
    quietHoursEnd: null,
  };
}

/**
 * Check if currently in user's quiet hours
 */
function isQuietHours(
  quietHoursStart: string | null,
  quietHoursEnd: string | null
): boolean {
  if (!quietHoursStart || !quietHoursEnd) {
    return false;
  }

  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = currentHour * 60 + currentMinute;

  const [startHour, startMinute] = quietHoursStart.split(':').map(Number);
  const [endHour, endMinute] = quietHoursEnd.split(':').map(Number);
  const startTime = startHour * 60 + startMinute;
  const endTime = endHour * 60 + endMinute;

  if (startTime < endTime) {
    return currentTime >= startTime && currentTime <= endTime;
  } else {
    // Quiet hours span midnight
    return currentTime >= startTime || currentTime <= endTime;
  }
}

/**
 * Send in-app notification
 */
async function sendInAppNotification(
  userId: string,
  title: string,
  message: string,
  data?: Record<string, any>,
  tenantId?: string
) {
  await db.insert(inAppNotifications).values({
    userId,
    tenantId: tenantId || 'default',
    title,
    message,
    data,
    read: false,
    createdAt: new Date(),
  });

  // Send real-time update via Redis pub/sub (WebSocket server subscribes to this)
  try {
    const redis = getRedisConnection();
    await redis.publish(
      `notifications:${tenantId || 'default'}:${userId}`,
      JSON.stringify({
        type: 'notification',
        userId,
        tenantId: tenantId || 'default',
        title,
        message,
        data,
        timestamp: new Date().toISOString(),
      })
    );
    
    console.log(`In-app notification sent to user ${userId} with real-time pub/sub`);
  } catch (error) {
    console.warn(`Failed to publish real-time notification (Redis not available):`, error);
    console.log(`In-app notification saved to database for user ${userId}`);
  }
}

/**
 * Process notification job
 */
async function processNotification(job: any) {
  const { userId, title, message, data, channels } = job.data;

  console.log(`Processing notification job ${job.id} for user ${userId}`);

  await job.updateProgress(10);

  // Get user preferences
  const preferences = await getUserPreferences(userId);
  const inQuietHours = isQuietHours(
    preferences.quietHoursStart,
    preferences.quietHoursEnd
  );

  await job.updateProgress(20);

  // Determine which channels to use
  const enabledChannels = channels.filter((channel: any) => {
    switch (channel) {
      case 'email':
        return preferences.emailEnabled && !inQuietHours;
      case 'sms':
        return preferences.smsEnabled && !inQuietHours;
      case 'push':
        return preferences.pushEnabled && !inQuietHours;
      case 'in-app':
        return preferences.inAppEnabled;
      default:
        return false;
    }
  });

  if (enabledChannels.length === 0) {
    console.log(`No enabled channels for user ${userId} (quiet hours: ${inQuietHours})`);
    return { success: true, sent: 0, channels: [] };
  }

  console.log(`Sending notification to ${userId} via: ${enabledChannels.join(', ')}`);

  await job.updateProgress(40);

  // Send to each enabled channel
  const results = await Promise.allSettled(
    enabledChannels.map(async (channel: any) => {
      switch (channel) {
        case 'email':
          // Get user email
          const userEmail = ('email' in preferences ? preferences.email : null) || (await getUserEmail(userId));
          if (userEmail) {
            await addEmailJob({
              to: userEmail,
              subject: title,
              template: 'notification',
              data: { title, message, ...data },
            });
            return { channel, success: true };
          }
          throw new Error('User email not found');

        case 'sms':
          // Get user phone
          const userPhone = 'phone' in preferences ? preferences.phone : null;
          if (userPhone) {
            await addSmsJob({
              to: userPhone,
              message: `${title}: ${message}`,
            });
            return { channel, success: true };
          }
          throw new Error('User phone not found');

        case 'push':
          // TODO: Implement push notifications
          console.log(`Push notification to ${userId}: ${title}`);
          return { channel, success: true };

        case 'in-app':
          await sendInAppNotification(userId, title, message, data, data?.tenantId);
          return { channel, success: true };

        default:
          throw new Error(`Unknown channel: ${channel}`);
      }
    })
  );

  await job.updateProgress(80);

  // Log to history
  const successfulChannels = results
    .filter((r: any) => r.status === 'fulfilled')
    .map((r: any) => (r as PromiseFulfilledResult<any>).value.channel);

  const failedChannels = results
    .filter((r: any) => r.status === 'rejected')
    .map((r, i) => ({
      channel: enabledChannels[i],
      error: (r as PromiseRejectedResult).reason,
    }));

  await db.insert(notificationHistory).values({
    userId,
    channel: 'multi',
    recipient: userId,
    subject: title,
    template: 'notification',
    status: failedChannels.length === 0 ? 'sent' : 'partial',
    error: failedChannels.length > 0 
      ? `Failed channels: ${failedChannels.map((f: any) => f.channel).join(', ')}`
      : undefined,
    sentAt: new Date(),
    metadata: {
      channels: successfulChannels,
      failedChannels: failedChannels.map((f: any) => f.channel),
    },
  });

  await job.updateProgress(100);

  return {
    success: failedChannels.length === 0,
    sent: successfulChannels.length,
    failed: failedChannels.length,
    channels: successfulChannels,
  };
}

/**
 * Get user email from Clerk
 */
async function getUserEmail(userId: string): Promise<string | null> {
  try {
    // TODO: Fetch from Clerk API
    return null;
  } catch (error) {
    console.error('Error fetching user email:', error);
    return null;
  }
}

// Create worker
export const notificationWorker = new Worker(
  'notifications',
  async (job: any) => {
    return await processNotification(job);
  },
  {
    connection,
    concurrency: 10,
  }
);

// Event handlers
notificationWorker.on('completed', (job: any) => {
  console.log(`Notification job ${job.id} completed`);
});

notificationWorker.on('failed', (job: any, err: any) => {
  console.error(`Notification job ${job?.id} failed:`, err.message);
});

notificationWorker.on('error', (err: any) => {
  console.error('Notification worker error:', err);
});

// Graceful shutdown
async function shutdown() {
  console.log('Shutting down notification worker...');
  await notificationWorker.close();
  await connection.quit();
  console.log('Notification worker stopped');
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
