/**
 * Mobile Push Notifications API
 * 
 * Handles sending push notifications to mobile devices
 * via APNs (iOS) and FCM (Android/Web)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db/db';
import { mobileDevices } from '@/db/schema/mobile-devices-schema';
import { APNsProvider } from '@/lib/mobile/providers/apns-provider';
import { FCMProvider } from '@/lib/mobile/providers/fcm-provider';
import { logger } from '@/lib/logger';
import { getAuth } from '@clerk/nextjs/server';
import { and, inArray } from 'drizzle-orm';

// Initialize providers
const apnsProvider = new APNsProvider();
const fcmProvider = new FCMProvider();

// Types
interface NotificationResult {
  success: boolean;
  sent: number;
  failed: number;
  errors?: string[];
  deviceCount?: number;
}

interface DeviceRecord {
  id: string;
  userId: string;
  organizationId: string | null;
  platform: 'ios' | 'android' | 'pwa';
  deviceToken: string;
}

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
}

// Send notification schema
const sendNotificationSchema = z.object({
  title: z.string().min(1).max(100),
  body: z.string().min(1).max(500),
  data: z.record(z.unknown()).optional(),
  actions: z.array(z.object({
    action: z.string(),
    title: z.string(),
  })).optional(),
  priority: z.enum(['high', 'normal']).default('normal'),
  ttl: z.number().min(0).max(86400).default(3600),
  targetType: z.enum(['device', 'user', 'organization', 'topic']),
  targetValue: z.string().or(z.array(z.string())),
});

// Send to multiple devices schema
const bulkNotificationSchema = z.object({
  notifications: z.array(sendNotificationSchema),
});

/**
 * POST /api/mobile/notifications
 * Send push notification(s) to devices
 */
export async function POST(request: NextRequest) {
  try {
    const auth = getAuth(request);
    
    if (!auth?.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Handle bulk notifications
    if (body.notifications) {
      const validation = bulkNotificationSchema.safeParse(body);
      
      if (!validation.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: validation.error.errors },
          { status: 400 }
        );
      }

      const results = await sendBulkNotifications(validation.data.notifications);
      return NextResponse.json(results);
    }

    // Handle single notification
    const validation = sendNotificationSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      );
    }

    const result = await sendNotification(validation.data);
    return NextResponse.json(result);
  } catch (error) {
    logger.error('Failed to send notification', { error });
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/mobile/notifications
 * Get notification history for user
 */
export async function GET(request: NextRequest) {
  try {
    const auth = getAuth(request);
    
    if (!auth?.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // In production, would query notification history
    const notifications: NotificationItem[] = [];
    const total = 0;

    return NextResponse.json({
      notifications,
      pagination: {
        total,
        limit,
        offset,
      },
    });
  } catch (error) {
    logger.error('Failed to get notifications', { error });
    return NextResponse.json(
      { error: 'Failed to get notifications' },
      { status: 500 }
    );
  }
}

/**
 * Send a single notification
 */
async function sendNotification(
  notification: z.infer<typeof sendNotificationSchema>
): Promise<NotificationResult> {
  const { targetType, targetValue, ...notificationData } = notification;

  // Get target devices
  const devices = await getTargetDevices(targetType, targetValue);

  if (devices.length === 0) {
    return {
      success: false,
      sent: 0,
      failed: 0,
      errors: ['No devices found for target'],
    };
  }

  // Separate by platform
  const iosDevices = devices.filter(d => d.platform === 'ios');
  const androidDevices = devices.filter(d => d.platform === 'android');
  const pwaDevices = devices.filter(d => d.platform === 'pwa');

  const results = await Promise.allSettled([
    // Send to iOS via APNs
    ...iosDevices.map(device => 
      apnsProvider.send(device.deviceToken, notificationData)
    ),
    // Send to Android via FCM
    ...androidDevices.map(device =>
      fcmProvider.send(device.deviceToken, notificationData)
    ),
    // Send to PWA via FCM
    ...pwaDevices.map(device =>
      fcmProvider.send(device.deviceToken, notificationData)
    ),
  ]);

  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  logger.info('Notification sent', {
    total: devices.length,
    successful,
    failed,
    targetType,
  });

  return {
    success: failed === 0,
    sent: successful,
    failed,
    deviceCount: devices.length,
  };
}

/**
 * Send bulk notifications
 */
async function sendBulkNotifications(
  notifications: z.infer<typeof sendNotificationSchema>[]
): Promise<{
  results: NotificationResult[];
  totalSent: number;
  totalFailed: number;
}> {
  const results: NotificationResult[] = [];
  let totalSent = 0;
  let totalFailed = 0;

  for (const notification of notifications) {
    const result = await sendNotification(notification);
    results.push(result);
    totalSent += result.sent;
    totalFailed += result.failed;
  }

  return {
    results,
    totalSent,
    totalFailed,
  };
}

/**
 * Get target devices based on target type
 */
async function getTargetDevices(
  targetType: 'device' | 'user' | 'organization' | 'topic',
  targetValue: string | string[]
): Promise<DeviceRecord[]> {
  const devices = await db
    .select()
    .from(mobileDevices)
    .where(eq(mobileDevices.isActive, true));

  switch (targetType) {
    case 'device':
      if (Array.isArray(targetValue)) {
        return devices.filter(d => targetValue.includes(d.id));
      }
      return devices.filter(d => d.id === targetValue);

    case 'user':
      if (Array.isArray(targetValue)) {
        return devices.filter(d => targetValue.includes(d.userId));
      }
      return devices.filter(d => d.userId === targetValue);

    case 'organization':
      if (Array.isArray(targetValue)) {
        return devices.filter(d => d.organizationId && targetValue.includes(d.organizationId as string));
      }
      return devices.filter(d => d.organizationId === targetValue);

    case 'topic':
      // Would handle FCM/APNs topics
      return [];
  }
}
