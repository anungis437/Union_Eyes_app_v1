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

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { newsletterDistributionLists } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { withOrganizationAuth } from '@/lib/organization-middleware';

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

export const GET = withOrganizationAuth(async (
  request: NextRequest,
  context,
  params?: { id: string }
) => {
  try {
    const { organizationId } = context;

    if (!params?.id) {
      return NextResponse.json({ error: 'List ID required' }, { status: 400 });
    }

    const [list] = await db
      .select()
      .from(newsletterDistributionLists)
      .where(
        and(
          eq(newsletterDistributionLists.id, params.id),
          eq(newsletterDistributionLists.organizationId, organizationId)
        )
      );

    if (!list) {
      return NextResponse.json({ error: 'List not found' }, { status: 404 });
    }

    return NextResponse.json({ list });
  } catch (error) {
return NextResponse.json(
      { error: 'Failed to fetch distribution list' },
      { status: 500 }
    );
  }
});

export const PUT = withOrganizationAuth(async (
  request: NextRequest,
  context,
  params?: { id: string }
) => {
  try {
    const { organizationId } = context;

    if (!params?.id) {
      return NextResponse.json({ error: 'List ID required' }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = updateListSchema.parse(body);

    const [list] = await db
      .update(newsletterDistributionLists)
      .set(validatedData)
      .where(
        and(
          eq(newsletterDistributionLists.id, params.id),
          eq(newsletterDistributionLists.organizationId, organizationId)
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
return NextResponse.json(
      { error: 'Failed to update distribution list' },
      { status: 500 }
    );
  }
});

export const DELETE = withOrganizationAuth(async (
  request: NextRequest,
  context,
  params?: { id: string }
) => {
  try {
    const { organizationId } = context;

    if (!params?.id) {
      return NextResponse.json({ error: 'List ID required' }, { status: 400 });
    }

    await db
      .delete(newsletterDistributionLists)
      .where(
        and(
          eq(newsletterDistributionLists.id, params.id),
          eq(newsletterDistributionLists.organizationId, organizationId)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
return NextResponse.json(
      { error: 'Failed to delete distribution list' },
      { status: 500 }
    );
  }
});
