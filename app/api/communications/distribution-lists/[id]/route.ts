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

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
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
      return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'List ID required'
    );
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
      return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'List not found'
    );
    }

    return NextResponse.json({ list });
  } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch distribution list',
      error
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
      return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'List ID required'
    );
    }

    const body = await request.json();
    const validation = updateListSchema.safeParse(body);
    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        validation.error.errors[0]?.message || 'Invalid request data'
      );
    }
    const validatedData = validation.data;

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
      return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'List not found'
    );
    }

    return NextResponse.json({ list });
  } catch (error) {
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to update distribution list',
      error
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
      return standardErrorResponse(
        ErrorCode.MISSING_REQUIRED_FIELD,
        'List ID required'
      );
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
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to delete distribution list',
      error
    );
  }
});
