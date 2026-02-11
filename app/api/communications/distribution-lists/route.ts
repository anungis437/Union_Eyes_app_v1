/**
 * Newsletter Distribution Lists API
 * 
 * Endpoints:
 * - GET /api/communications/distribution-lists - List all distribution lists
 * - POST /api/communications/distribution-lists - Create new list
 * 
 * Version: 1.0.0
 * Created: December 6, 2025
 */
// TODO: Migrate to withApiAuth wrapper pattern for consistency
// Original pattern used getCurrentUser() with manual auth checks


import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { newsletterDistributionLists } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';

const createListSchema = z.object({
  name: z.string().min(1, 'List name is required'),
  description: z.string().optional(),
  listType: z.enum(['manual', 'dynamic', 'segment']),
  filterCriteria: z.object({
    roles: z.array(z.string()).optional(),
    statuses: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    dateRange: z.object({
      field: z.string(),
      start: z.string().optional(),
      end: z.string().optional(),
    }).optional(),
    customFields: z.record(z.any()).optional(),
  }).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { tenantId } = user;

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }

    const lists = await db
      .select()
      .from(newsletterDistributionLists)
      .where(eq(newsletterDistributionLists.organizationId, tenantId))
      .orderBy(desc(newsletterDistributionLists.createdAt));

    return NextResponse.json({ lists });
  } catch (error) {
    console.error('Error fetching distribution lists:', error);
    return NextResponse.json(
      { error: 'Failed to fetch distribution lists' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id: userId, tenantId } = user;

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createListSchema.parse(body);

    const [list] = await db
      .insert(newsletterDistributionLists)
      .values({
        organizationId: tenantId,
        createdBy: userId,
        ...validatedData,
      })
      .returning();

    return NextResponse.json({ list }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating distribution list:', error);
    return NextResponse.json(
      { error: 'Failed to create distribution list' },
      { status: 500 }
    );
  }
}

