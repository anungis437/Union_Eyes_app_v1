/**
 * API Route: GET /api/notifications/preferences
 * 
 * Get current user's notification preferences
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { userNotificationPreferences } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user preferences
    const preferences = await db.query.userNotificationPreferences.findFirst({
      where: eq(userNotificationPreferences.userId, userId),
    });

    // Return defaults if not found
    if (!preferences) {
      return NextResponse.json({
        emailEnabled: true,
        smsEnabled: false,
        pushEnabled: true,
        inAppEnabled: true,
        digestFrequency: 'daily',
        quietHoursStart: null,
        quietHoursEnd: null,
        claimUpdates: true,
        documentUpdates: true,
        deadlineAlerts: true,
        systemAnnouncements: true,
        securityAlerts: true,
      });
    }

    return NextResponse.json(preferences);
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * API Route: PUT /api/notifications/preferences
 * 
 * Update user's notification preferences
 */

export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate input
    const {
      emailEnabled,
      smsEnabled,
      pushEnabled,
      inAppEnabled,
      digestFrequency,
      quietHoursStart,
      quietHoursEnd,
      claimUpdates,
      documentUpdates,
      deadlineAlerts,
      systemAnnouncements,
      securityAlerts,
      email,
      phone,
    } = body;

    // Get tenant ID from user
    // TODO: Implement tenant resolution
    const tenantId = 'default';

    // Check if preferences exist
    const existing = await db.query.userNotificationPreferences.findFirst({
      where: eq(userNotificationPreferences.userId, userId),
    });

    let result;

    if (existing) {
      // Update existing preferences
      result = await db
        .update(userNotificationPreferences)
        .set({
          emailEnabled,
          smsEnabled,
          pushEnabled,
          inAppEnabled,
          digestFrequency,
          quietHoursStart,
          quietHoursEnd,
          claimUpdates,
          documentUpdates,
          deadlineAlerts,
          systemAnnouncements,
          securityAlerts,
          email: email || existing.email,
          phone: phone || existing.phone,
          updatedAt: new Date(),
        })
        .where(eq(userNotificationPreferences.userId, userId))
        .returning();
    } else {
      // Create new preferences
      if (!email) {
        return NextResponse.json(
          { error: 'Email is required for new preferences' },
          { status: 400 }
        );
      }

      result = await db
        .insert(userNotificationPreferences)
        .values({
          userId,
          tenantId,
          email,
          phone: phone || null,
          emailEnabled: emailEnabled ?? true,
          smsEnabled: smsEnabled ?? false,
          pushEnabled: pushEnabled ?? true,
          inAppEnabled: inAppEnabled ?? true,
          digestFrequency: digestFrequency || 'daily',
          quietHoursStart,
          quietHoursEnd,
          claimUpdates: claimUpdates ?? true,
          documentUpdates: documentUpdates ?? true,
          deadlineAlerts: deadlineAlerts ?? true,
          systemAnnouncements: systemAnnouncements ?? true,
          securityAlerts: securityAlerts ?? true,
        })
        .returning();
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
