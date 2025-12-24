/**
 * Newsletter List Export API
 * 
 * Endpoint:
 * - GET /api/communications/distribution-lists/[id]/export - Export subscribers to CSV
 * 
 * Version: 1.0.0
 * Created: December 6, 2025
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { 
  newsletterDistributionLists, 
  newsletterListSubscribers,
  profiles 
} from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

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

    // Verify list exists
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

    // Get subscribers with profile details
    // Note: profiles table doesn't have firstName/lastName - using email only
    const subscribers = await db
      .select({
        email: newsletterListSubscribers.email,
        status: newsletterListSubscribers.status,
        subscribedAt: newsletterListSubscribers.subscribedAt,
        unsubscribedAt: newsletterListSubscribers.unsubscribedAt,
        profileEmail: profiles.email,
      })
      .from(newsletterListSubscribers)
      .leftJoin(profiles, eq(newsletterListSubscribers.profileId, profiles.userId))
      .where(eq(newsletterListSubscribers.listId, params.id));

    // Generate CSV
    const headers = ['Email', 'Status', 'Subscribed At', 'Unsubscribed At'];
    const rows = subscribers.map((sub) => [
      sub.email,
      sub.status,
      sub.subscribedAt?.toISOString() || '',
      sub.unsubscribedAt?.toISOString() || '',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="list-${params.id}-subscribers.csv"`,
      },
    });
  } catch (error) {
    console.error('Error exporting list:', error);
    return NextResponse.json(
      { error: 'Failed to export list' },
      { status: 500 }
    );
  }
}
