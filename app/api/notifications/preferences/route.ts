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
import { withApiAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { withRLSContext } from '@/lib/db/with-rls-context';

import { standardSuccessResponse } from '@/lib/api/standardized-responses';
export const GET = async (request: NextRequest) => {
  return withRoleAuth(10, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      // Get user preferences
      const preferences = await withRLSContext({ organizationId }, async (db) => {
        return await db.query.userNotificationPreferences.findFirst({
          where: eq(userNotificationPreferences.userId, userId),
        });
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
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Internal server error',
      error
    );
    }
    })(request);
};


const notificationsPreferencesSchema = z.object({
  emailEnabled: z.boolean().optional(),
  smsEnabled: z.boolean().optional(),
  pushEnabled: z.boolean().optional(),
  inAppEnabled: z.boolean().optional(),
  digestFrequency: z.enum(["daily", "weekly", "monthly", "realtime"]).optional(),
  quietHoursStart: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)").optional().nullable(),
  quietHoursEnd: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)").optional().nullable(),
  claimUpdates: z.boolean().optional(),
  documentUpdates: z.boolean().optional(),
  deadlineAlerts: z.boolean().optional(),
  systemAnnouncements: z.boolean().optional(),
  securityAlerts: z.boolean().optional(),
  email: z.string().email("Invalid email address").optional(),
  phone: z.string().min(10, "Invalid phone number").max(20).optional(),
});

export const PUT = async (request: NextRequest) => {
  return withRoleAuth(20, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      const body = await request.json();
    // Validate request body
    const validation = notificationsPreferencesSchema.safeParse(body);
    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request data',
        validation.error.errors
      );
    }
    
    const { emailEnabled, smsEnabled, pushEnabled, inAppEnabled, digestFrequency, quietHoursStart, quietHoursEnd, claimUpdates, documentUpdates, deadlineAlerts, systemAnnouncements, securityAlerts, email, phone } = validation.data;

      // Validate input
    // DUPLICATE REMOVED (Phase 2): Multi-line destructuring of body
    // const {
    // emailEnabled,
    // smsEnabled,
    // pushEnabled,
    // inAppEnabled,
    // digestFrequency,
    // quietHoursStart,
    // quietHoursEnd,
    // claimUpdates,
    // documentUpdates,
    // deadlineAlerts,
    // systemAnnouncements,
    // securityAlerts,
    // email,
    // phone,
    // } = body;

      // Check if preferences exist
      const existing = await withRLSContext({ organizationId }, async (db) => {
        return await db.query.userNotificationPreferences.findFirst({
          where: eq(userNotificationPreferences.userId, userId),
        });
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
          return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Email is required for new preferences'
    );
        }

        result = await db
          .insert(userNotificationPreferences)
          .values({
            userId,
            organizationId,
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
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Internal server error',
      error
    );
    }
    })(request);
};
