/**
 * Training Notification Preferences API
 * 
 * MIGRATION STATUS: ✅ Migrated to use withRLSContext()
 * - All database operations wrapped in withRLSContext() for automatic context setting
 * - RLS policies enforce tenant isolation at database level
 */

import { NextRequest, NextResponse } from "next/server";
import { withRLSContext } from '@/lib/db/with-rls-context';
import { sql } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { withApiAuth } from '@/lib/api-auth-guard';

export const dynamic = "force-dynamic";

/**
 * GET /api/education/notification-preferences?memberId={id}
 * or
 * GET /api/education/notification-preferences?token={unsubscribe_token}
 * 
 * Retrieves notification preferences for a member
 */
export const GET = withApiAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get("memberId");
    const token = searchParams.get("token");

    if (!memberId && !token) {
      return NextResponse.json(
        { error: "Either memberId or token is required" },
        { status: 400 }
      );
    }

    // Query by member ID or unsubscribe token using RLS-protected query
    return withRLSContext(async (tx) => {
      const whereClause = memberId
        ? sql`member_id = ${memberId}`
        : sql`unsubscribe_token = ${token}`;

      const [preferences] = await tx.execute(sql`
        SELECT 
          id,
          member_id,
          registration_confirmations,
          session_reminders,
          completion_certificates,
          certification_expiry,
          program_milestones,
          unsubscribe_token,
          created_at,
          updated_at
        FROM training_notification_preferences
        WHERE ${whereClause}
      `);

      // If no preferences exist, return defaults
      if (!preferences) {
        return NextResponse.json({
          memberId,
          registrationConfirmations: true,
          sessionReminders: true,
          completionCertificates: true,
          certificationExpiry: true,
          programMilestones: true,
          isDefault: true,
        });
      }

      return NextResponse.json({
        id: preferences.id,
        memberId: preferences.member_id,
        registrationConfirmations: preferences.registration_confirmations,
        sessionReminders: preferences.session_reminders,
        completionCertificates: preferences.completion_certificates,
        certificationExpiry: preferences.certification_expiry,
        programMilestones: preferences.program_milestones,
        unsubscribeToken: preferences.unsubscribe_token,
        createdAt: preferences.created_at,
        updatedAt: preferences.updated_at,
        isDefault: false,
      });
    });
  } catch (error) {
    logger.error("Error fetching notification preferences", error as Error);
    return NextResponse.json(
      { error: "Failed to fetch notification preferences" },
      { status: 500 }
    );
  }
});

/**
 * PATCH /api/education/notification-preferences
 * 
 * Updates notification preferences for a member
 * Body: {
 *   memberId?: string,
 *   token?: string,
 *   registrationConfirmations?: boolean,
 *   sessionReminders?: boolean,
 *   completionCertificates?: boolean,
 *   certificationExpiry?: boolean,
 *   programMilestones?: boolean
 * }
 */
export const PATCH = withApiAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const {
      memberId,
      token,
      registrationConfirmations,
      sessionReminders,
      completionCertificates,
      certificationExpiry,
      programMilestones,
    } = body;

    if (!memberId && !token) {
      return NextResponse.json(
        { error: "Either memberId or token is required" },
        { status: 400 }
      );
    }

    // Build update fields
    const updates: string[] = [];
    const values: any[] = [];

    if (registrationConfirmations !== undefined) {
      updates.push("registration_confirmations = $" + (values.length + 1));
      values.push(registrationConfirmations);
    }
    if (sessionReminders !== undefined) {
      updates.push("session_reminders = $" + (values.length + 1));
      values.push(sessionReminders);
    }
    if (completionCertificates !== undefined) {
      updates.push("completion_certificates = $" + (values.length + 1));
      values.push(completionCertificates);
    }
    if (certificationExpiry !== undefined) {
      updates.push("certification_expiry = $" + (values.length + 1));
      values.push(certificationExpiry);
    }
    if (programMilestones !== undefined) {
      updates.push("program_milestones = $" + (values.length + 1));
      values.push(programMilestones);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: "No preferences to update" },
        { status: 400 }
      );
    }

    // Determine WHERE clause
    const whereClause = memberId
      ? sql`member_id = ${memberId}`
      : sql`unsubscribe_token = ${token}`;

    // If we don't have a memberId, look it up first
    let effectiveMemberId = memberId;
    if (!effectiveMemberId && token) {
      const memberLookup = await db.execute(sql`SELECT member_id FROM training_notification_preferences WHERE unsubscribe_token = ${token}`);
      if (memberLookup.length > 0) {
        effectiveMemberId = (memberLookup[0] as Record<string, unknown>).member_id;
      }
    }

    if (!effectiveMemberId) {
      return NextResponse.json(
        { error: "Could not determine member from token" },
        { status: 400 }
      );
    }

    // Upsert: Update if exists, insert if not
    const result = await db.execute(sql`
      INSERT INTO training_notification_preferences (
        member_id,
        registration_confirmations,
        session_reminders,
        completion_certificates,
        certification_expiry,
        program_milestones
      )
      VALUES (
        ${effectiveMemberId},
        ${registrationConfirmations ?? true},
        ${sessionReminders ?? true},
        ${completionCertificates ?? true},
        ${certificationExpiry ?? true},
        ${programMilestones ?? true}
      )
      ON CONFLICT (member_id)
      DO UPDATE SET
        registration_confirmations = COALESCE(${registrationConfirmations}, training_notification_preferences.registration_confirmations),
        session_reminders = COALESCE(${sessionReminders}, training_notification_preferences.session_reminders),
        completion_certificates = COALESCE(${completionCertificates}, training_notification_preferences.completion_certificates),
        certification_expiry = COALESCE(${certificationExpiry}, training_notification_preferences.certification_expiry),
        program_milestones = COALESCE(${programMilestones}, training_notification_preferences.program_milestones),
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `);

    const updated = result[0] as Record<string, unknown>;

    return NextResponse.json({
      id: updated.id,
      memberId: updated.member_id,
      registrationConfirmations: updated.registration_confirmations,
      sessionReminders: updated.session_reminders,
      completionCertificates: updated.completion_certificates,
      certificationExpiry: updated.certification_expiry,
      programMilestones: updated.program_milestones,
      unsubscribeToken: updated.unsubscribe_token,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
    });
  } catch (error) {
    logger.error("Error updating notification preferences", error as Error);
    return NextResponse.json(
      { error: "Failed to update notification preferences" },
      { status: 500 }
    );
  }
});

/**
 * POST /api/education/notification-preferences/unsubscribe
 * 
 * Unsubscribes from all training notifications
 * Body: { token: string }
 */
export const POST = withApiAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { error: "Unsubscribe token is required" },
        { status: 400 }
      );
    }

    // Update all preferences to false
    const result = await db.execute(sql`
      UPDATE training_notification_preferences
      SET
        registration_confirmations = false,
        session_reminders = false,
        completion_certificates = false,
        certification_expiry = false,
        program_milestones = false,
        updated_at = CURRENT_TIMESTAMP
      WHERE unsubscribe_token = ${token}
      RETURNING member_id
    `);

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Invalid unsubscribe token" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Successfully unsubscribed from all training notifications",
    });
  } catch (error) {
    logger.error("Error unsubscribing from notifications", error as Error);
    return NextResponse.json(
      { error: "Failed to unsubscribe" },
      { status: 500 }
    );
  }
});

