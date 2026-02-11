/**
 * API Route: POST /api/notifications/device
 * 
 * Register or update a push device token for the current user.
 */

import { NextResponse } from "next/server";
import { db } from "@/db";
import { pushDevices } from "@/db/schema";
import { withEnhancedRoleAuth } from "@/lib/api-auth-guard";

export const POST = withEnhancedRoleAuth<{
  success: boolean;
  deviceId?: string;
  error?: string;
}>(10, async (request, context) => {
  try {
    const body = await request.json();
    const {
      deviceToken,
      platform,
      deviceName,
      deviceModel,
      osVersion,
      appVersion,
      timezone,
      organizationId,
      tenantId,
    } = body || {};

    const resolvedOrgId = context.organizationId || organizationId || tenantId;

    if (!resolvedOrgId) {
      return NextResponse.json(
        { success: false, error: "Organization ID required" },
        { status: 400 }
      );
    }

    if (!deviceToken || !platform) {
      return NextResponse.json(
        { success: false, error: "deviceToken and platform are required" },
        { status: 400 }
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
