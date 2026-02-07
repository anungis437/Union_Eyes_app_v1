import { NextRequest, NextResponse } from 'next/server';
import { requestDeadlineExtension } from '@/db/queries/deadline-queries';
import { getUserFromRequest } from '@/lib/auth';
import { cookies } from 'next/headers';
import { db, organizations } from '@/db';
import { eq } from 'drizzle-orm';

/**
 * POST /api/deadlines/[id]/extend
 * Request a deadline extension
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
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
    const { daysRequested, reason } = body;

    // Validation
    if (!daysRequested || daysRequested < 1) {
      return NextResponse.json(
        { error: 'Days requested must be at least 1' },
        { status: 400 }
      );
    }

    if (!reason || reason.trim().length < 20) {
      return NextResponse.json(
        { error: 'Reason must be at least 20 characters' },
        { status: 400 }
      );
    }

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
    console.error('Error requesting extension:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to request extension' },
      { status: 500 }
    );
  }
}
