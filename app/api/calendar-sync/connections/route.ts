import { logApiAuditEvent } from "@/lib/middleware/api-security";
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
import { db } from '@/db/db';
import { externalCalendarConnections } from '@/db/schema/calendar-schema';
import { eq, and } from 'drizzle-orm';
import { z } from "zod";
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";

export const GET = async (request: NextRequest) => {
  return withEnhancedRoleAuth(10, async (request, context) => {
    const user = { id: context.userId, organizationId: context.organizationId };

  try {
      const connections = await db
        .select()
        .from(externalCalendarConnections)
        .where(eq(externalCalendarConnections.user.id, user.id));

      // Remove sensitive data
      const safeConnections = connections.map(conn => ({
        id: conn.id,
        provider: conn.provider,
        providerAccountId: conn.providerAccountId,
        syncEnabled: conn.syncEnabled,
        syncDirection: conn.syncDirection,
        syncStatus: conn.syncStatus,
        lastSyncAt: conn.lastSyncAt,
        syncError: conn.syncError,
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
  })
  })(request);
};

export const POST = async (request: NextRequest) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
    const user = { id: context.userId, organizationId: context.organizationId };

  try {
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
  })
  })(request);
};
