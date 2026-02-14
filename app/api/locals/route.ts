/**
 * Locals API
 * 
 * Manages union local chapters (regional chapters)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { locals } from '@/db/schema/union-structure-schema';
import { and, desc, like, or } from 'drizzle-orm';
import { requireUserForOrganization } from '@/lib/api-auth-guard';

// Validation schema for creating local
const createLocalSchema = z.object({
  localNumber: z.string().min(1, 'Local number required'),
  name: z.string().min(1, 'Name required'),
  organizationId: z.string().uuid(),
  address: z.object({
    street: z.string(),
    city: z.string(),
    province: z.string(),
    postalCode: z.string(),
    country: z.string(),
  }).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  website: z.string().url().optional(),
  presidentUserId: z.string().uuid().optional(),
  secretaryUserId: z.string().uuid().optional(),
  treasurerUserId: z.string().uuid().optional(),
  status: z.enum(['active', 'inactive', 'merged', 'dissolved']).default('active'),
  charterDate: z.string().optional(),
});

/**
 * GET /api/locals
 * List locals with filters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // Build query conditions
    const conditions = [];
    if (organizationId) {
      conditions.push(eq(locals.organizationId, organizationId));
    }
    if (status) {
      conditions.push(eq(locals.status, status));
    }
    if (search) {
      conditions.push(
        or(
          like(locals.localNumber, `%${search}%`),
          like(locals.name, `%${search}%`)
        )
      );
    }

    // Fetch locals
    const localsData = await db
      .select({
        id: locals.id,
        localNumber: locals.localNumber,
        name: locals.name,
        organizationId: locals.organizationId,
        address: locals.address,
        phone: locals.phone,
        email: locals.email,
        website: locals.website,
        presidentUserId: locals.presidentUserId,
        secretaryUserId: locals.secretaryUserId,
        treasurerUserId: locals.treasurerUserId,
        memberCount: locals.memberCount,
        activeCount: locals.activeCount,
        status: locals.status,
        charterDate: locals.charterDate,
        createdAt: locals.createdAt,
        updatedAt: locals.updatedAt,
      })
      .from(locals)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(locals.localNumber))
      .limit(limit)
      .offset(offset);

    // Count total
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(locals)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return NextResponse.json({
      locals: localsData,
      pagination: {
        page,
        limit,
        total: Number(count),
        totalPages: Math.ceil(Number(count) / limit),
      },
    });
  } catch (error: Record<string, unknown>) {
    console.error('Error fetching locals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch locals', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/locals
 * Create new local
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createLocalSchema.parse(body);
    const authContext = await requireUserForOrganization(validatedData.organizationId);

    // Create local
    const [newLocal] = await db
      .insert(locals)
      .values({
        ...validatedData,
        charterDate: validatedData.charterDate ? new Date(validatedData.charterDate) : null,
        memberCount: 0,
        activeCount: 0,
        createdBy: authContext.userId,
        lastModifiedBy: authContext.userId,
      })
      .returning();

    return NextResponse.json(
      {
        message: 'Local created successfully',
        local: newLocal,
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
    console.error('Error creating local:', error);
    return NextResponse.json(
      { error: 'Failed to create local', details: error.message },
      { status: 500 }
    );
  }
}
