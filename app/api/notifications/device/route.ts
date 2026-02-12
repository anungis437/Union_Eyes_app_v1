/**
 * API Route: POST /api/notifications/device
 * 
 * Register or update a push device token for the current user.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { pushDevices } from "@/db/schema";
import { withEnhancedRoleAuth } from "@/lib/api-auth-guard";
import { 
  standardErrorResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';

const deviceRegistrationSchema = z.object({
  deviceToken: z.string().min(10, 'Device token must be at least 10 characters'),
  platform: z.enum(['ios', 'android', 'web']),
  deviceName: z.string().optional(),
  deviceModel: z.string().optional(),
  osVersion: z.string().optional(),
  appVersion: z.string().optional(),
  timezone: z.string().optional(),
  organizationId: z.string().uuid('Invalid organization ID').optional(),
});

export const POST = withEnhancedRoleAuth<{
  success: boolean;
  deviceId?: string;
  error?: string;
}>(10, async (request, context) => {
  try {
    const body = await request.json();
    
    // Validate request body
    const validation = deviceRegistrationSchema.safeParse(body);
    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid device registration data',
        validation.error.errors
      );
    }
    
    const {
      deviceToken,
      platform,
      deviceName,
      deviceModel,
      osVersion,
      appVersion,
      timezone,
      organizationId,
    } = validation.data;

    const resolvedOrgId = context.organizationId || organizationId;

    if (!resolvedOrgId) {
      return standardErrorResponse(
        ErrorCode.MISSING_REQUIRED_FIELD,
        'Organization ID required'
      );
    }

    const now = new Date();

    const [device] = await db
      .insert(pushDevices)
      .values({
        organizationId: resolvedOrgId,
        profileId: context.userId,
        deviceToken,
        platform,
        deviceName,
        deviceModel,
        osVersion,
        appVersion,
        timezone,
        enabled: true,
        lastActiveAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: pushDevices.deviceToken,
        set: {
          organizationId: resolvedOrgId,
          profileId: context.userId,
          platform,
          deviceName,
          deviceModel,
          osVersion,
          appVersion,
          timezone,
          enabled: true,
          lastActiveAt: now,
          updatedAt: now,
        },
      })
      .returning();

    return NextResponse.json({
      success: true,
      deviceId: device?.id,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to register device" },
      { status: 500 }
    );
  }
});
