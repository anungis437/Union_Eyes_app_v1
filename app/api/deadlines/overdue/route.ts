import { NextRequest, NextResponse } from 'next/server';
import { getOverdueDeadlines } from '@/db/queries/deadline-queries';
import { getCurrentUser } from '@/lib/api-auth-guard';
import { cookies } from 'next/headers';
import { db, organizations } from '@/db';
import { eq } from 'drizzle-orm';

/**
 * GET /api/deadlines/overdue
 * Get all overdue deadlines for the tenant
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
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
    console.error('Error fetching overdue deadlines:', error);
    return NextResponse.json(
      { error: 'Failed to fetch overdue deadlines' },
      { status: 500 }
    );
  }
}
