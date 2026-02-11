import { NextRequest, NextResponse } from 'next/server';
import { getOverdueDeadlines } from '@/db/queries/deadline-queries';
import { getCurrentUser } from '@/lib/api-auth-guard';
import { cookies } from 'next/headers';
import { db, organizations } from '@/db';
import { eq } from 'drizzle-orm';

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
/**
 * GET /api/deadlines/overdue
 * Get all overdue deadlines for the tenant
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return standardErrorResponse(
      ErrorCode.AUTH_REQUIRED,
      'Unauthorized'
    );
    }

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

    const deadlines = await getOverdueDeadlines(organizationId);

    return NextResponse.json({
      deadlines,
      count: deadlines.length,
    });
  } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch overdue deadlines',
      error
    );
  }
}

