/**
 * Member Employment Details API
 * 
 * Manages member employment attributes and work information
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { eq } from 'drizzle-orm';
import { memberEmploymentDetails } from '@/db/schema/member-profile-v2-schema';

// Validation schema
const updateEmploymentSchema = z.object({
  classification: z.enum(['full_time', 'part_time', 'casual', 'contract', 'seasonal']).optional(),
  jobTitle: z.string().optional(),
  jobCode: z.string().optional(),
  payGrade: z.string().optional(),
  workLocationId: z.string().uuid().optional(),
  department: z.string().optional(),
  division: z.string().optional(),
  seniorityDate: z.string().datetime().optional(),
  shiftType: z.enum(['day', 'evening', 'night', 'rotating', 'on_call']).optional(),
  shiftStart: z.string().optional(),
  shiftEnd: z.string().optional(),
  workDays: z.array(z.string()).optional(),
  hoursPerWeek: z.number().optional(),
  supervisorName: z.string().optional(),
  employmentStatus: z.enum(['active', 'leave', 'layoff', 'suspended', 'terminated']).optional(),
  statusReason: z.string().optional(),
  benefitsEligible: z.boolean().optional(),
  probationEndDate: z.string().datetime().optional(),
  steward: z.boolean().optional(),
  officer: z.boolean().optional(),
});

/**
 * GET /api/members/[id]/employment
 * Get member employment details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id;

    const [employment] = await db
      .select()
      .from(memberEmploymentDetails)
      .where(eq(memberEmploymentDetails.userId, userId));

    if (!employment) {
      return NextResponse.json(
        { error: 'Employment details not found' },
        { status: 404 }
      );
    }

    // Calculate seniority years if seniorityDate exists
    if (employment.seniorityDate) {
      const years = Math.floor(
        (Date.now() - new Date(employment.seniorityDate).getTime()) / (1000 * 60 * 60 * 24 * 365)
      );
      employment.seniorityYears = years;
    }

    return NextResponse.json({ employment });
  } catch (error: any) {
    console.error('Error fetching employment details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch employment details', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/members/[id]/employment
 * Update member employment details
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id;
    const body = await request.json();
    const validatedData = updateEmploymentSchema.parse(body);

    // Calculate seniority years if date provided
    let seniorityYears;
    if (validatedData.seniorityDate) {
      seniorityYears = Math.floor(
        (Date.now() - new Date(validatedData.seniorityDate).getTime()) / (1000 * 60 * 60 * 24 * 365)
      );
    }

    // Check if exists
    const [existing] = await db
      .select()
      .from(memberEmploymentDetails)
      .where(eq(memberEmploymentDetails.userId, userId));

    if (existing) {
      // Update
      const [updated] = await db
        .update(memberEmploymentDetails)
        .set({
          ...validatedData,
          seniorityYears,
          updatedAt: new Date(),
          lastModifiedBy: 'system',
        })
        .where(eq(memberEmploymentDetails.userId, userId))
        .returning();

      return NextResponse.json({
        message: 'Employment details updated successfully',
        employment: updated,
      });
    } else {
      // Create
      const [created] = await db
        .insert(memberEmploymentDetails)
        .values({
          userId,
          organizationId: 'org-id',
          classification: validatedData.classification || 'full_time',
          ...validatedData,
          seniorityYears,
        })
        .returning();

      return NextResponse.json(
        {
          message: 'Employment details created successfully',
          employment: created,
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
    console.error('Error updating employment details:', error);
    return NextResponse.json(
      { error: 'Failed to update employment details', details: error.message },
      { status: 500 }
    );
  }
}
