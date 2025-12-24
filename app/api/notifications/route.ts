/**
 * API Route: GET /api/notifications
 * 
 * Get in-app notifications for current user
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { inAppNotifications } from '@/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const tenantId = searchParams.get('tenantId'); // Add tenantId filter
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build base where conditions
    const baseConditions = [eq(inAppNotifications.userId, userId)];
    
    // Add tenant filter if provided
    if (tenantId) {
      baseConditions.push(eq(inAppNotifications.tenantId, tenantId));
    }

    // Build query with optional unreadOnly filter
    const whereConditions = unreadOnly 
      ? [...baseConditions, eq(inAppNotifications.read, false)]
      : baseConditions;

    const notifications = await db
      .select()
      .from(inAppNotifications)
      .where(and(...whereConditions))
      .orderBy(desc(inAppNotifications.createdAt))
      .limit(limit);

    // Get unread count with tenant filter
    const unreadCountConditions = [
      eq(inAppNotifications.userId, userId),
      eq(inAppNotifications.read, false),
    ];
    
    if (tenantId) {
      unreadCountConditions.push(eq(inAppNotifications.tenantId, tenantId));
    }

    const unreadCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(inAppNotifications)
      .where(and(...unreadCountConditions));

    return NextResponse.json({
      notifications,
      unreadCount: unreadCount[0]?.count || 0,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
