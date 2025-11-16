/**
 * Calendar Sync Connections Management API
 * 
 * Endpoints:
 * - GET /api/calendar-sync/connections - List user's external calendar connections
 * - POST /api/calendar-sync/connections/[id]/sync - Trigger manual sync
 * - DELETE /api/calendar-sync/connections/[id] - Disconnect external calendar
 * - PATCH /api/calendar-sync/connections/[id] - Update sync settings
 * 
 * @module api/calendar-sync/connections
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db/db';
import { externalCalendarConnections } from '@/db/schema/calendar-schema';
import { eq, and } from 'drizzle-orm';

/**
 * GET /api/calendar-sync/connections
 * List all external calendar connections for the user
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const connections = await db
      .select()
      .from(externalCalendarConnections)
      .where(eq(externalCalendarConnections.userId, userId));

    // Remove sensitive data
    const safeConnections = connections.map(conn => ({
      id: conn.id,
      provider: conn.provider,
      providerAccountId: conn.providerAccountId,
      syncEnabled: conn.syncEnabled,
      syncDirection: conn.syncDirection,
      syncStatus: conn.syncStatus,
      lastSyncAt: conn.lastSyncAt,
      lastSyncError: conn.lastSyncError,
      calendarMappings: conn.calendarMappings,
      createdAt: conn.createdAt,
      updatedAt: conn.updatedAt,
    }));

    return NextResponse.json({
      connections: safeConnections,
      count: safeConnections.length,
    });
  } catch (error) {
    console.error('Error fetching connections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch connections' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/calendar-sync/connections
 * Create a new connection (redirect to OAuth)
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { provider } = body;

    if (!provider || !['google', 'microsoft'].includes(provider)) {
      return NextResponse.json(
        { error: 'Invalid provider. Must be "google" or "microsoft"' },
        { status: 400 }
      );
    }

    // Return OAuth URL for client to redirect to
    const authUrl = `/api/calendar-sync/${provider}/auth`;

    return NextResponse.json({
      message: 'Redirect to authorization URL',
      authUrl,
    });
  } catch (error) {
    console.error('Error creating connection:', error);
    return NextResponse.json(
      { error: 'Failed to create connection' },
      { status: 500 }
    );
  }
}
