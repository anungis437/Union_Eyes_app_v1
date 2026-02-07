import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * API Route: GET /api/notifications/preferences
 * 
 * Get current user's notification preferences
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { userNotificationPreferences } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { z } from "zod";
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";

export const GET = async (request: NextRequest) => {
  return withEnhancedRoleAuth(10, async (request, context) => {
    const user = { id: context.userId, organizationId: context.organizationId };

  try {
      // Get user preferences
      const preferences = await db.query.userNotificationPreferences.findFirst({
        where: eq(userNotificationPreferences.user.id, user.id),
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
  })
  })(request);
};

export const PUT = async (request: NextRequest) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
    const user = { id: context.userId, organizationId: context.organizationId };

  try {
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
        where: eq(userNotificationPreferences.user.id, user.id),
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
          .where(eq(userNotificationPreferences.user.id, user.id))
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
            user.id,
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
  })
  })(request);
};
