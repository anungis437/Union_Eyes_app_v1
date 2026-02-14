/**
 * Steward Assignments API
 * 
 * Manages steward assignments and coverage areas
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { stewardAssignments } from '@/db/schema/union-structure-schema';
import { and, desc, or } from 'drizzle-orm';
import { requireUserForOrganization } from '@/lib/api-auth-guard';
import { logger } from '@/lib/logger';

// Validation schema for creating steward assignment
const createStewardSchema = z.object({
  userId: z.string().uuid(),
  stewardType: z.enum(['steward', 'chief_steward', 'rep', 'officer']),
  assignmentType: z.enum(['worksite', 'unit', 'local', 'department', 'shift']),
  worksiteId: z.string().uuid().optional(),
  unitId: z.string().uuid().optional(),
  localId: z.string().uuid().optional(),
  organizationId: z.string().uuid(),
  department: z.string().optional(),
  shift: z.string().optional(),
  isPrimary: z.boolean().default(true),
  coverageArea: z.string().optional(),
  memberCount: z.number().int().optional(),
  effectiveFrom: z.string(),
  effectiveTo: z.string().optional(),
  phoneNumber: z.string().optional(),
  email: z.string().email().optional(),
  availabilityNotes: z.string().optional(),
  trainingCompletedDate: z.string().optional(),
  certificationExpiryDate: z.string().optional(),
});

/**
 * GET /api/stewards
 * List steward assignments with filters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const localId = searchParams.get('localId');
    const unitId = searchParams.get('unitId');
    const worksiteId = searchParams.get('worksiteId');
    const stewardType = searchParams.get('stewardType');
    const status = searchParams.get('status');
    const includeInactive = searchParams.get('includeInactive') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // Build query conditions
    const conditions = [];
    if (organizationId) {
      conditions.push(eq(stewardAssignments.organizationId, organizationId));
    }
    if (localId) {
      conditions.push(eq(stewardAssignments.localId, localId));
    }
    if (unitId) {
      conditions.push(eq(stewardAssignments.unitId, unitId));
    }
    if (worksiteId) {
      conditions.push(eq(stewardAssignments.worksiteId, worksiteId));
    }
    if (stewardType) {
      conditions.push(eq(stewardAssignments.stewardType, stewardType));
    }
    if (status) {
      conditions.push(eq(stewardAssignments.status, status));
    } else if (!includeInactive) {
      conditions.push(eq(stewardAssignments.status, 'active'));
    }

    // Fetch steward assignments
    const stewards = await db
      .select()
      .from(stewardAssignments)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(stewardAssignments.effectiveFrom))
      .limit(limit)
      .offset(offset);

    // Count total
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(stewardAssignments)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return NextResponse.json({
      stewards,
      pagination: {
        page,
        limit,
        total: Number(count),
        totalPages: Math.ceil(Number(count) / limit),
      },
    });
  } catch (error: Record<string, unknown>) {
    logger.error('Error fetching steward assignments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch steward assignments', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/stewards
 * Create new steward assignment
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createStewardSchema.parse(body);
    const authContext = await requireUserForOrganization(validatedData.organizationId);

    // Check for overlapping assignments
    const existing = await db
      .select()
      .from(stewardAssignments)
      .where(
        and(
          eq(stewardAssignments.userId, validatedData.userId),
          eq(stewardAssignments.status, 'active'),
          validatedData.worksiteId 
            ? eq(stewardAssignments.worksiteId, validatedData.worksiteId)
            : validatedData.unitId
            ? eq(stewardAssignments.unitId, validatedData.unitId)
            : eq(stewardAssignments.localId, validatedData.localId!)
        )
      );

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'User already has an active assignment in this area' },
        { status: 400 }
      );
    }

    // Create steward assignment
    const [newSteward] = await db
      .insert(stewardAssignments)
      .values({
        ...validatedData,
        effectiveFrom: new Date(validatedData.effectiveFrom),
        effectiveTo: validatedData.effectiveTo ? new Date(validatedData.effectiveTo) : null,
        trainingCompletedDate: validatedData.trainingCompletedDate 
          ? new Date(validatedData.trainingCompletedDate) 
          : null,
        certificationExpiryDate: validatedData.certificationExpiryDate 
          ? new Date(validatedData.certificationExpiryDate) 
          : null,
        status: 'active',
        createdBy: authContext.userId,
        lastModifiedBy: authContext.userId,
      })
      .returning();

    return NextResponse.json(
      {
        message: 'Steward assignment created successfully',
        steward: newSteward,
      },
      { status: 201 }
    );
  } catch (error: Record<string, unknown>) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message.startsWith('Forbidden')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    logger.error('Error creating steward assignment:', error);
    return NextResponse.json(
      { error: 'Failed to create steward assignment', details: error.message },
      { status: 500 }
    );
  }
}
