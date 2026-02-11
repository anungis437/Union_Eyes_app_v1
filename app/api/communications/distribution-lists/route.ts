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

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { newsletterDistributionLists } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { withOrganizationAuth } from '@/lib/organization-middleware';

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
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

export const GET = withOrganizationAuth(async (request: NextRequest, context) => {
  try {
    const { organizationId } = context;

    const lists = await db
      .select()
      .from(newsletterDistributionLists)
      .where(eq(newsletterDistributionLists.organizationId, organizationId))
      .orderBy(desc(newsletterDistributionLists.createdAt));

    return NextResponse.json({ lists });
  } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch distribution lists',
      error
    );
  }
});

export const POST = withOrganizationAuth(async (request: NextRequest, context) => {
  try {
    const { organizationId, userId } = context;

    const body = await request.json();
    const validation = createListSchema.safeParse(body);
    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        validation.error.errors[0]?.message || 'Invalid request data'
      );
    }
    const validatedData = validation.data;

    const [list] = await db
      .insert(newsletterDistributionLists)
      .values({
        organizationId,
        createdBy: userId,
        ...validatedData,
      })
      .returning();

    return standardSuccessResponse(
      {  list  },
      undefined,
      201
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to create distribution list',
      error
    );
  }
});

