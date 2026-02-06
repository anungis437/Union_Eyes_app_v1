/**
 * Email Worker - Processes email jobs from the queue
 * 
 * Handles all email sending with template rendering,
 * retry logic, and delivery tracking
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

import { EmailJobData } from '../job-queue';
import { sendEmail } from '../email-service';
import { render } from '@react-email/render';
import { db } from '../../db/db';
import { notificationHistory, userNotificationPreferences } from '../../db/schema';
import { eq, and } from 'drizzle-orm';

// Email templates
// import ClaimStatusNotificationEmail from '../../emails/ClaimStatusNotification'; // TODO: Create this template
import WelcomeEmail from '../../emails/WelcomeEmail';
import PasswordResetEmail from '../../emails/PasswordResetEmail';
import DigestEmail from '../../emails/DigestEmail';
import ReportReadyEmail from '../../emails/ReportReadyEmail';
import DeadlineAlertEmail from '../../emails/DeadlineAlertEmail';

const connection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
});

// Template renderers
const templateRenderers: Record<string, (data: any) => Promise<string>> = {
  // 'claim-status': (data) => render(ClaimStatusNotificationEmail(data)), // TODO: Create template
  'welcome': (data) => render(WelcomeEmail(data)),
  'password-reset': (data) => render(PasswordResetEmail(data)),
  'digest': (data) => render(DigestEmail(data)),
  'report-ready': (data) => render(ReportReadyEmail(data)),
  'deadline-alert': (data) => render(DeadlineAlertEmail(data)),
};

/**
 * Check if user wants email notifications
 */
async function checkUserPreferences(email: string): Promise<boolean> {
  try {
    const preferences = await db.query.userNotificationPreferences.findFirst({
      where: eq(userNotificationPreferences.email, email),
    });

    return preferences?.emailEnabled ?? true; // Default to enabled
  } catch (error) {
    console.error('Error checking user preferences:', error);
    return true; // Default to enabled on error
  }
}

/**
 * Log notification to history
 */
async function logNotification(
  userId: string | null,
  email: string,
  subject: string,
  template: string,
  status: 'sent' | 'failed',
  error?: string
) {
  try {
    await db.insert(notificationHistory).values({
      userId,
      channel: 'email',
      recipient: email,
      subject,
      template,
      status,
      error,
      sentAt: new Date(),
    });
  } catch (err) {
    console.error('Error logging notification:', err);
  }
}

/**
 * Process email job
 */
async function processEmailJob(job: any) {
  const { to, subject, template, data, priority } = job.data;

  console.log(`Processing email job ${job.id}: ${template} to ${to}`);

  // Update progress
  await job.updateProgress(10);

  // Normalize recipients
  const recipients = Array.isArray(to) ? to : [to];

  // Check preferences and send to each recipient
  const results = await Promise.allSettled(
    recipients.map(async (email) => {
      // Check if user wants emails
      const wantsEmail = await checkUserPreferences(email);
      
      if (!wantsEmail && priority !== 1) {
        // Skip non-critical emails if user disabled
        console.log(`Skipping email to ${email} (disabled by user)`);
        await logNotification(null, email, subject, template, 'sent', 'Skipped by user preference');
        return { email, skipped: true };
      }

      await job.updateProgress(30);

      // Render template
      let html: string;
      try {
        const renderer = templateRenderers[template];
        if (!renderer) {
          throw new Error(`Unknown template: ${template}`);
        }
        html = await renderer(data);
      } catch (error) {
        console.error(`Error rendering template ${template}:`, error);
        throw error;
      }

      await job.updateProgress(60);

      // Send email
      try {
        await sendEmail({
          to: [{ email, name: data.userName || email }],
          subject,
          html,
        });

        await logNotification(data.userId || null, email, subject, template, 'sent');

        console.log(`Email sent to ${email}`);
        return { email, sent: true };
      } catch (error) {
        console.error(`Error sending email to ${email}:`, error);
        await logNotification(
          data.userId || null,
          email,
          subject,
          template,
          'failed',
          error instanceof Error ? error.message : 'Unknown error'
        );
        throw error;
      }
    })
  );

  await job.updateProgress(100);

  // Check for failures
  const failures = results.filter((r: any) => r.status === 'rejected');
  if (failures.length > 0) {
    throw new Error(
      `Failed to send ${failures.length}/${recipients.length} emails`
    );
  }

  return {
    success: true,
    sent: results.filter((r: any) => r.status === 'fulfilled').length,
    total: recipients.length,
  };
}

/**
 * Process digest email job
 */
async function processDigestJob(job: any) {
  const { data: jobData } = job;
  const { frequency } = jobData.data;

  console.log(`Processing ${frequency} digest job ${job.id}`);

  // Get users who want digest emails
  const users = await db.query.userNotificationPreferences.findMany({
    where: and(
      eq(userNotificationPreferences.emailEnabled, true),
      eq(userNotificationPreferences.digestFrequency, frequency)
    ),
  });

  if (users.length === 0) {
    console.log('No users want digest emails');
    return { success: true, sent: 0, total: 0 };
  }

  console.log(`Sending digest to ${users.length} users`);

  // Send digest to each user
  let sent = 0;
  for (const user of users) {
    try {
      // Gather user's notifications from the past period
      const digestData = {
        userId: user.userId!,
        email: user.email,
        frequency,
        notifications: [], // TODO: Fetch unread notifications
      };

      const html = await render(DigestEmail(digestData));

      await sendEmail({
        to: [{ email: user.email, name: user.email }],
        subject: `Your ${frequency === 'daily' ? 'Daily' : 'Weekly'} Union Claims Digest`,
        html,
      });

      await logNotification(user.userId!, user.email, 'Digest', 'digest', 'sent');

      sent++;
    } catch (error) {
      console.error(`Error sending digest to ${user.email}:`, error);
    }
  }

  return { success: true, sent, total: users.length };
}

// Create worker
export const emailWorker = new Worker(
  'email',
  async (job: any) => {
    // Handle different job types
    if (job.name === 'email-digest') {
      return await processDigestJob(job);
    }

    return await processEmailJob(job);
  },
  {
    connection,
    concurrency: 5, // Process 5 emails concurrently
    limiter: {
      max: 100, // Max 100 emails
      duration: 60000, // Per minute
    },
  }
);

// Event handlers
emailWorker.on('completed', (job: any) => {
  console.log(`Email job ${job.id} completed`);
});

emailWorker.on('failed', (job: any, err: any) => {
  console.error(`Email job ${job?.id} failed:`, err.message);
});

emailWorker.on('error', (err: any) => {
  console.error('Email worker error:', err);
});

// Graceful shutdown
async function shutdown() {
  console.log('Shutting down email worker...');
  await emailWorker.close();
  await connection.quit();
  console.log('Email worker stopped');
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
