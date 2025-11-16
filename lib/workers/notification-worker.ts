/**
 * Notification Worker - Processes multi-channel notifications
 * 
 * Dispatches notifications across email, SMS, push, and in-app channels
 * based on user preferences
 */

import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { NotificationJobData } from '../job-queue';
import { addEmailJob } from '../job-queue';
import { addSmsJob } from '../job-queue';
import { db } from '@/db';
import { notificationHistory, userNotificationPreferences, inAppNotifications } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

const connection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
});

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
  data?: Record<string, any>
) {
  await db.insert(inAppNotifications).values({
    userId,
    title,
    message,
    data,
    read: false,
    createdAt: new Date(),
  });

  // TODO: Send real-time update via WebSocket
  console.log(`In-app notification sent to user ${userId}`);
}

/**
 * Process notification job
 */
async function processNotification(job: Job<NotificationJobData>) {
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
  const enabledChannels = channels.filter((channel) => {
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
    enabledChannels.map(async (channel) => {
      switch (channel) {
        case 'email':
          // Get user email
          const userEmail = preferences.email || (await getUserEmail(userId));
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
          const userPhone = preferences.phone;
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
          await sendInAppNotification(userId, title, message, data);
          return { channel, success: true };

        default:
          throw new Error(`Unknown channel: ${channel}`);
      }
    })
  );

  await job.updateProgress(80);

  // Log to history
  const successfulChannels = results
    .filter((r) => r.status === 'fulfilled')
    .map((r) => (r as PromiseFulfilledResult<any>).value.channel);

  const failedChannels = results
    .filter((r) => r.status === 'rejected')
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
      ? `Failed channels: ${failedChannels.map((f) => f.channel).join(', ')}`
      : undefined,
    sentAt: new Date(),
    metadata: {
      channels: successfulChannels,
      failedChannels: failedChannels.map((f) => f.channel),
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
  async (job: Job<NotificationJobData>) => {
    return await processNotification(job);
  },
  {
    connection,
    concurrency: 10,
  }
);

// Event handlers
notificationWorker.on('completed', (job) => {
  console.log(`Notification job ${job.id} completed`);
});

notificationWorker.on('failed', (job, err) => {
  console.error(`Notification job ${job?.id} failed:`, err.message);
});

notificationWorker.on('error', (err) => {
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
