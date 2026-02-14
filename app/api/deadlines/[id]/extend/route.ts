import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { requestDeadlineExtension } from '@/db/queries/deadline-queries';
import { getCurrentUser } from '@/lib/api-auth-guard';
import { cookies } from 'next/headers';
import { organizations } from '@/db';
import { eq } from 'drizzle-orm';

import { standardSuccessResponse } from '@/lib/api/standardized-responses';

const extendDeadlineSchema = z.object({
  daysRequested: z.number().int().min(1, 'Days requested must be at least 1').max(365, 'Cannot request more than 365 days'),
  reason: z.string().min(20, 'Reason must be at least 20 characters').max(500, 'Reason cannot exceed 500 characters'),
});
/**
 * POST /api/deadlines/[id]/extend
 * Request a deadline extension
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return standardErrorResponse(
      ErrorCode.AUTH_REQUIRED,
      'Unauthorized'
    );
    }

    const { id: userId } = user;

    // Get organization from cookies
    const cookieStore = await cookies();
    const orgSlug = cookieStore.get('active-organization')?.value;
    
    if (!orgSlug) {
      return NextResponse.json(
        { error: 'No active organization' },
        { status: 400 }
      );
    }

    // Get organization ID from slug
    const orgResult = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.slug, orgSlug))
      .limit(1);

    if (orgResult.length === 0) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 400 }
      );
    }

    const organizationId = orgResult[0].id;

    const body = await request.json();
    
    // Validate request body
    const validation = extendDeadlineSchema.safeParse(body);
    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid extension request',
        validation.error.errors
      );
    }

    const { daysRequested, reason } = validation.data;

    const extension = await requestDeadlineExtension(
      params.id,
      organizationId,
      userId,
      daysRequested,
      reason.trim()
    );

    return NextResponse.json({
      success: true,
      extension,
      message: daysRequested > 7 
        ? 'Extension request submitted for approval'
        : 'Extension granted automatically',
    });
  } catch (error) {
return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to request extension' },
      { status: 500 }
    );
  }
}
