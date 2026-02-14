/**
 * Communication Preferences API Routes
 * 
 * GET /api/messaging/preferences - Get user preferences
 * PUT /api/messaging/preferences - Update preferences
 * 
 * Phase 4: Communications & Organizing
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { communicationPreferences, consentRecords } from '@/db/schema';
import { and } from 'drizzle-orm';
import { withRLSContext } from '@/lib/db/rls-context';
import { auth } from '@clerk/nextjs/server';
import { logger } from '@/lib/logger';

/**
 * GET /api/messaging/preferences
 * Get current user's communication preferences
 */
export async function GET(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const preferences = await withRLSContext(async () => {
      const [result] = await db
        .select()
        .from(communicationPreferences)
        .where(
          and(
            eq(communicationPreferences.userId, userId),
            eq(communicationPreferences.organizationId, orgId)
          )
        )
        .limit(1);

      // If no preferences exist, create default preferences
      if (!result) {
        const [newPrefs] = await db
          .insert(communicationPreferences)
          .values({
            organizationId: orgId,
            userId,
            emailEnabled: true,
            smsEnabled: false, // Opt-in by default (CASL compliance)
            pushEnabled: true,
            phoneEnabled: false,
            mailEnabled: false,
            categories: {
              campaign: true,
              transactional: true,
              alerts: true,
              newsletters: true,
              social: true,
            },
            frequency: 'real_time',
            quietHours: {
              enabled: false,
              start: '22:00',
              end: '08:00',
              timezone: 'America/Toronto',
            },
            globallyUnsubscribed: false,
            metadata: {},
          })
          .returning();

        return newPrefs;
      }

      return result;
    }, { organizationId: orgId, userId });

    return NextResponse.json(preferences);
  } catch (error) {
    logger.error('Error fetching preferences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch preferences' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/messaging/preferences
 * Update communication preferences
 */
export async function PUT(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();

    const result = await withRLSContext(async () => {
      // Get existing preferences
      const [existing] = await db
        .select()
        .from(communicationPreferences)
        .where(
          and(
            eq(communicationPreferences.userId, userId),
            eq(communicationPreferences.organizationId, orgId)
          )
        )
        .limit(1);

      if (!existing) {
        throw new Error('Preferences not found');
      }

      // Track consent changes
      const consentChanges: Array<{
        channel: string;
        oldValue: boolean;
        newValue: boolean;
      }> = [];

      if (body.emailEnabled !== undefined && body.emailEnabled !== existing.emailEnabled) {
        consentChanges.push({
          channel: 'email',
          oldValue: existing.emailEnabled,
          newValue: body.emailEnabled,
        });
      }

      if (body.smsEnabled !== undefined && body.smsEnabled !== existing.smsEnabled) {
        consentChanges.push({
          channel: 'sms',
          oldValue: existing.smsEnabled,
          newValue: body.smsEnabled,
        });
      }

      // Update preferences
      const [updated] = await db
        .update(communicationPreferences)
        .set({
          emailEnabled: body.emailEnabled !== undefined ? body.emailEnabled : existing.emailEnabled,
          smsEnabled: body.smsEnabled !== undefined ? body.smsEnabled : existing.smsEnabled,
          pushEnabled: body.pushEnabled !== undefined ? body.pushEnabled : existing.pushEnabled,
          phoneEnabled: body.phoneEnabled !== undefined ? body.phoneEnabled : existing.phoneEnabled,
          mailEnabled: body.mailEnabled !== undefined ? body.mailEnabled : existing.mailEnabled,
          categories: body.categories || existing.categories,
          frequency: body.frequency || existing.frequency,
          quietHours: body.quietHours || existing.quietHours,
          metadata: body.metadata || existing.metadata,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(communicationPreferences.userId, userId),
            eq(communicationPreferences.organizationId, orgId)
          )
        )
        .returning();

      // Create consent records for audit trail
      const ipAddress = request.headers.get('x-forwarded-for') || 
                        request.headers.get('x-real-ip') || 
                        'unknown';
      const userAgent = request.headers.get('user-agent') || 'unknown';

      for (const change of consentChanges) {
        await db.insert(consentRecords).values({
          organizationId: orgId,
          userId,
          consentType: `${change.channel}_marketing`,
          channel: change.channel,
          status: change.newValue ? 'granted' : 'revoked',
          method: 'web_form',
          consentText: `User ${change.newValue ? 'enabled' : 'disabled'} ${change.channel} communications`,
          ipAddress,
          userAgent,
          metadata: {
            previousValue: change.oldValue,
            newValue: change.newValue,
          },
        });
      }

      return updated;
    }, { organizationId: orgId, userId });

    return NextResponse.json(result);
  } catch (error) {
    logger.error('Error updating preferences:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update preferences' },
      { status: 500 }
    );
  }
}
