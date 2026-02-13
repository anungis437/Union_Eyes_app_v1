/**
 * Mobile Device Registration API
 * 
 * Handles device registration, updates, and deactivation
 * for iOS, Android, and PWA platforms
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db/db';
import { mobileDevices } from '@/db/schema/mobile-devices-schema';
import { eq, and } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { getAuth } from '@clerk/nextjs/server';

// Device registration schema
const deviceRegistrationSchema = z.object({
  deviceId: z.string().min(1),
  deviceToken: z.string().min(32),
  platform: z.enum(['ios', 'android', 'pwa']),
  deviceName: z.string().optional(),
  deviceModel: z.string().optional(),
  osVersion: z.string().optional(),
  appVersion: z.string().optional(),
  timezone: z.string().default('UTC'),
  locale: z.string().default('en-US'),
  capabilities: z.object({
    camera: z.boolean().default(true),
    gps: z.boolean().default(true),
    biometric: z.boolean().default(true),
    push: z.boolean().default(true),
  }).optional(),
});

// Device update schema
const deviceUpdateSchema = z.object({
  deviceName: z.string().optional(),
  deviceModel: z.string().optional(),
  osVersion: z.string().optional(),
  appVersion: z.string().optional(),
  timezone: z.string().optional(),
  locale: z.string().optional(),
  pushEnabled: z.boolean().optional(),
  notificationSound: z.boolean().optional(),
  notificationVibration: z.boolean().optional(),
});

/**
 * GET /api/mobile/devices
 * Get all devices for current user
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
    const organizationId = searchParams.get('organizationId');
    const activeOnly = searchParams.get('activeOnly') === 'true';

    let query = db.select().from(mobileDevices);

    if (organizationId) {
      query = query.where(
        and(
          eq(mobileDevices.userId, auth.userId),
          eq(mobileDevices.organizationId, organizationId as any),
          activeOnly ? eq(mobileDevices.isActive, true) : undefined
        )
      );
    } else {
      query = query.where(eq(mobileDevices.userId, auth.userId));
    }

    const devices = await query.orderBy(mobileDevices.lastActiveAt);

    // Remove sensitive data
    const sanitizedDevices = devices.map(device => ({
      id: device.id,
      platform: device.platform,
      deviceName: device.deviceName,
      deviceModel: device.deviceModel,
      osVersion: device.osVersion,
      appVersion: device.appVersion,
      pushEnabled: device.pushEnabled,
      isActive: device.isActive,
      lastActiveAt: device.lastActiveAt,
    }));

    return NextResponse.json({ devices: sanitizedDevices });
  } catch (error) {
    logger.error('Failed to get devices', { error });
    return NextResponse.json(
      { error: 'Failed to get devices' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/mobile/devices
 * Register a new device
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
    const validation = deviceRegistrationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      );
    }

    const data = validation.data;
    const organizationId = body.organizationId;

    // Check if device already exists
    const existing = await db
      .select()
      .from(mobileDevices)
      .where(eq(mobileDevices.deviceId, data.deviceId))
      .limit(1);

    if (existing.length > 0) {
      // Update existing device
      const [updated] = await db
        .update(mobileDevices)
        .set({
          deviceToken: data.deviceToken,
          deviceName: data.deviceName,
          deviceModel: data.deviceModel,
          osVersion: data.osVersion,
          appVersion: data.appVersion,
          timezone: data.timezone,
          locale: data.locale,
          lastActiveAt: new Date(),
          isActive: true,
        })
        .where(eq(mobileDevices.id, existing[0].id))
        .returning();

      return NextResponse.json({
        success: true,
        deviceId: updated.id,
        message: 'Device updated'
      });
    }

    // Register new device
    const [device] = await db
      .insert(mobileDevices)
      .values({
        deviceId: data.deviceId,
        deviceToken: data.deviceToken,
        userId: auth.userId,
        organizationId: organizationId as any,
        platform: data.platform,
        deviceName: data.deviceName,
        deviceModel: data.deviceModel,
        osVersion: data.osVersion,
        appVersion: data.appVersion,
        timezone: data.timezone,
        locale: data.locale,
        capabilities: data.capabilities,
        pushEnabled: true,
        notificationSound: true,
        notificationVibration: true,
        isCompliant: true,
        isActive: true,
        registeredAt: new Date(),
        lastActiveAt: new Date(),
      })
      .returning();

    logger.info('Device registered', { 
      deviceId: device.id, 
      platform: device.platform,
      userId: auth.userId 
    });

    return NextResponse.json({
      success: true,
      deviceId: device.id,
      message: 'Device registered'
    }, { status: 201 });
  } catch (error) {
    logger.error('Failed to register device', { error });
    return NextResponse.json(
      { error: 'Failed to register device' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/mobile/devices
 * Update device settings
 */
export async function PATCH(request: NextRequest) {
  try {
    const auth = getAuth(request);
    
    if (!auth?.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { deviceId, ...updates } = body;

    const validation = deviceUpdateSchema.safeParse(updates);

    if (!validation.success || !deviceId) {
      return NextResponse.json(
        { error: 'Validation failed' },
        { status: 400 }
      );
    }

    // Verify ownership
    const existing = await db
      .select()
      .from(mobileDevices)
      .where(
        and(
          eq(mobileDevices.id, deviceId),
          eq(mobileDevices.userId, auth.userId)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Device not found' },
        { status: 404 }
      );
    }

    const [updated] = await db
      .update(mobileDevices)
      .set({
        ...validation.data,
        lastActiveAt: new Date(),
      })
      .where(eq(mobileDevices.id, deviceId))
      .returning();

    return NextResponse.json({
      success: true,
      message: 'Device updated'
    });
  } catch (error) {
    logger.error('Failed to update device', { error });
    return NextResponse.json(
      { error: 'Failed to update device' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/mobile/devices
 * Deactivate a device
 */
export async function DELETE(request: NextRequest) {
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

    if (!deviceId) {
      return NextResponse.json(
        { error: 'Device ID required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const existing = await db
      .select()
      .from(mobileDevices)
      .where(
        and(
          eq(mobileDevices.id, deviceId),
          eq(mobileDevices.userId, auth.userId)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Device not found' },
        { status: 404 }
      );
    }

    // Soft delete - archive device
    await db
      .update(mobileDevices)
      .set({
        isActive: false,
        isArchived: true,
        archivedAt: new Date(),
      })
      .where(eq(mobileDevices.id, deviceId));

    logger.info('Device deactivated', { deviceId, userId: auth.userId });

    return NextResponse.json({
      success: true,
      message: 'Device deactivated'
    });
  } catch (error) {
    logger.error('Failed to deactivate device', { error });
    return NextResponse.json(
      { error: 'Failed to deactivate device' },
      { status: 500 }
    );
  }
}
