/**
 * Member Contact Preferences API
 * 
 * Manages member communication preferences and accessibility needs
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { eq } from 'drizzle-orm';
import { memberContactPreferences } from '@/db/schema/member-profile-v2-schema';

// Validation schema
const updatePreferencesSchema = z.object({
  preferredContactMethod: z.enum(['email', 'phone', 'sms', 'mail', 'in_person']).optional(),
  preferredLanguage: z.string().optional(),
  emailOptIn: z.boolean().optional(),
  smsOptIn: z.boolean().optional(),
  phoneOptIn: z.boolean().optional(),
  mailOptIn: z.boolean().optional(),
  notificationPreferences: z.object({
    caseUpdates: z.boolean().optional(),
    duesReminders: z.boolean().optional(),
    eventInvitations: z.boolean().optional(),
    newsletter: z.boolean().optional(),
    urgentOnly: z.boolean().optional(),
  }).optional(),
  bestContactTimes: z.record(z.array(z.string())).optional(),
  alternativeEmail: z.string().email().optional(),
  alternativePhone: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  emergencyContactRelation: z.string().optional(),
  accessibilityNeeds: z.string().optional(),
  interpreterRequired: z.boolean().optional(),
  interpreterLanguage: z.string().optional(),
});

/**
 * GET /api/members/[id]/preferences
 * Get member contact preferences
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id;

    const [preferences] = await db
      .select()
      .from(memberContactPreferences)
      .where(eq(memberContactPreferences.userId, userId));

    if (!preferences) {
      return NextResponse.json(
        { error: 'Preferences not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ preferences });
  } catch (error: any) {
    console.error('Error fetching preferences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch preferences', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/members/[id]/preferences
 * Update member contact preferences
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id;
    const body = await request.json();
    const validatedData = updatePreferencesSchema.parse(body);

    // Check if preferences exist
    const [existing] = await db
      .select()
      .from(memberContactPreferences)
      .where(eq(memberContactPreferences.userId, userId));

    if (existing) {
      // Update existing
      const [updated] = await db
        .update(memberContactPreferences)
        .set({
          ...validatedData,
          updatedAt: new Date(),
          lastModifiedBy: 'system', // TODO: Get from auth
        })
        .where(eq(memberContactPreferences.userId, userId))
        .returning();

      return NextResponse.json({
        message: 'Preferences updated successfully',
        preferences: updated,
      });
    } else {
      // Create new
      const [created] = await db
        .insert(memberContactPreferences)
        .values({
          userId,
          organizationId: 'org-id', // TODO: Get from member or context
          ...validatedData,
        })
        .returning();

      return NextResponse.json(
        {
          message: 'Preferences created successfully',
          preferences: created,
        },
        { status: 201 }
      );
    }
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error updating preferences:', error);
    return NextResponse.json(
      { error: 'Failed to update preferences', details: error.message },
      { status: 500 }
    );
  }
}
