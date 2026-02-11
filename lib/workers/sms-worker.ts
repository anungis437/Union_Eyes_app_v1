/**
 * SMS Worker - Processes SMS jobs from the queue
 * 
 * Handles SMS sending via Twilio with delivery tracking
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

import { SmsJobData } from '../job-queue';
import { db } from '../../db/db';
import { notificationHistory, userNotificationPreferences } from '../../db/schema';
import { eq } from 'drizzle-orm';
import twilio from 'twilio';

const connection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
});

/**
 * Validate Twilio environment variables at startup
 */
function validateTwilioConfig(): { valid: boolean; error?: string } {
  if (!process.env.TWILIO_ACCOUNT_SID) {
    return { valid: false, error: 'TWILIO_ACCOUNT_SID not configured' };
  }
  if (!process.env.TWILIO_AUTH_TOKEN) {
    return { valid: false, error: 'TWILIO_AUTH_TOKEN not configured' };
  }
  if (!process.env.TWILIO_PHONE_NUMBER) {
    return { valid: false, error: 'TWILIO_PHONE_NUMBER not configured' };
  }
  return { valid: true };
}

// Initialize Twilio client with proper validation
const twilioConfig = validateTwilioConfig();
const twilioClient = twilioConfig.valid
  ? twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!)
  : null;

const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || '';

// Log Twilio configuration status
if (twilioClient) {
  console.log('✓ Twilio SMS worker initialized successfully');
} else {
  console.warn(`⚠ Twilio SMS worker disabled: ${twilioConfig.error}`);
}

/**
 * Check if user wants SMS notifications
 */
async function checkUserPreferences(phone: string): Promise<boolean> {
  try {
    const preferences = await db.query.userNotificationPreferences.findFirst({
      where: eq(userNotificationPreferences.phone, phone),
    });

    return preferences?.smsEnabled ?? false; // Default to disabled
  } catch (error) {
    console.error('Error checking user preferences:', error);
    return false;
  }
}

/**
 * Log SMS to history
 */
async function logSms(
  userId: string | null,
  phone: string,
  message: string,
  status: 'sent' | 'failed',
  error?: string,
  twilioSid?: string
) {
  try {
    await db.insert(notificationHistory).values({
      userId,
      channel: 'sms',
      recipient: phone,
      subject: message.substring(0, 100),
      template: 'sms',
      status,
      error,
      sentAt: new Date(),
      metadata: { twilioSid },
    });
  } catch (err) {
    console.error('Error logging SMS:', err);
  }
}

/**
 * Format phone number to E.164 format
 */
function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // Add country code if not present (assume US)
  if (digits.length === 10) {
    return `+1${digits}`;
  } else if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  // Already has country code
  return `+${digits}`;
}

/**
 * Process SMS job
 */
async function processSmsJob(job: any) {
  const { to, message, priority } = job.data;

  console.log(`Processing SMS job ${job.id} to ${to}`);

  // Check if Twilio is configured
  if (!twilioClient || !TWILIO_PHONE_NUMBER) {
    console.warn('Twilio not configured, skipping SMS');
    await logSms(null, to, message, 'failed', 'Twilio not configured');
    return { success: false, error: 'Twilio not configured' };
  }

  await job.updateProgress(10);

  // Format phone number
  const formattedPhone = formatPhoneNumber(to);

  // Check if user wants SMS (skip for critical priority)
  if (priority !== 1) {
    const wantsSms = await checkUserPreferences(formattedPhone);
    if (!wantsSms) {
      console.log(`Skipping SMS to ${formattedPhone} (disabled by user)`);
      await logSms(null, formattedPhone, message, 'sent', 'Skipped by user preference');
      return { success: true, skipped: true };
    }
  }

  await job.updateProgress(30);

  // Send SMS via Twilio
  try {
    const result = await twilioClient.messages.create({
      body: message,
      from: TWILIO_PHONE_NUMBER,
      to: formattedPhone,
    });

    await job.updateProgress(80);

    await logSms(null, formattedPhone, message, 'sent', undefined, result.sid);

    // Log without exposing full phone number
    const maskedPhone = formattedPhone.replace(/(\+\d{1,3})(\d+)(\d{4})/, '$1****$3');
    console.log(`SMS sent to ${maskedPhone} (SID: ${result.sid})`);  

    await job.updateProgress(100);

    return {
      success: true,
      sid: result.sid,
      status: result.status,
    };
  } catch (error) {
    console.error(`Error sending SMS to ${formattedPhone}:`, error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await logSms(null, formattedPhone, message, 'failed', errorMessage);

    throw error;
  }
}

// Create worker
export const smsWorker = new Worker(
  'sms',
  async (job: any) => {
    return await processSmsJob(job);
  },
  {
    connection,
    concurrency: 3, // Process 3 SMS concurrently
    limiter: {
      max: 10, // Max 10 SMS
      duration: 1000, // Per second (Twilio rate limit)
    },
  }
);

// Event handlers
smsWorker.on('completed', (job: any) => {
  console.log(`SMS job ${job.id} completed`);
});

smsWorker.on('failed', (job: any, err: any) => {
  console.error(`SMS job ${job?.id} failed:`, err.message);
});

smsWorker.on('error', (err: any) => {
  console.error('SMS worker error:', err);
});

// Graceful shutdown
async function shutdown() {
  console.log('Shutting down SMS worker...');
  await smsWorker.close();
  await connection.quit();
  console.log('SMS worker stopped');
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

