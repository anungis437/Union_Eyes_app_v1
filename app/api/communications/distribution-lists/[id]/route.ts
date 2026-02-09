/**
 * Newsletter Distribution List Detail API
 * 
 * Endpoints:
 * - GET /api/communications/distribution-lists/[id] - Get list by ID
 * - PUT /api/communications/distribution-lists/[id] - Update list
 * - DELETE /api/communications/distribution-lists/[id] - Delete list
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
import { eq, and } from 'drizzle-orm';
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';

const updateListSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!user.tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }

    const [list] = await db
      .select()
      .from(newsletterDistributionLists)
      .where(
        and(
          eq(newsletterDistributionLists.id, params.id),
          eq(newsletterDistributionLists.organizationId, user.tenantId)
        )
      );

    if (!list) {
      return NextResponse.json({ error: 'List not found' }, { status: 404 });
    }

    return NextResponse.json({ list });
  } catch (error) {
    console.error('Error fetching distribution list:', error);
    return NextResponse.json(
      { error: 'Failed to fetch distribution list' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!user.tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateListSchema.parse(body);

    const [list] = await db
      .update(newsletterDistributionLists)
      .set(validatedData)
      .where(
        and(
          eq(newsletterDistributionLists.id, params.id),
          eq(newsletterDistributionLists.organizationId, user.tenantId)
        )
      )
      .returning();

    if (!list) {
      return NextResponse.json({ error: 'List not found' }, { status: 404 });
    }

    return NextResponse.json({ list });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating distribution list:', error);
    return NextResponse.json(
      { error: 'Failed to update distribution list' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!user.tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }

    await db
      .delete(newsletterDistributionLists)
      .where(
        and(
          eq(newsletterDistributionLists.id, params.id),
          eq(newsletterDistributionLists.organizationId, user.tenantId)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting distribution list:', error);
    return NextResponse.json(
      { error: 'Failed to delete distribution list' },
      { status: 500 }
    );
  }
}
