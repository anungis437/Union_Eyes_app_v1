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
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
export const GET = async (request: NextRequest) => {
  return withRoleAuth(10, async (request, context) => {
    const { userId, organizationId } = context;

  try {
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
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch connections',
      error
    );
    }
    })(request);
};


const calendarSyncConnectionsSchema = z.object({
  provider: z.string().uuid('Invalid provider'),
});

export const POST = async (request: NextRequest) => {
  return withRoleAuth(20, async (request, context) => {
    const user = { id: context.userId, organizationId: context.organizationId };

  try {
      const body = await request.json();
    // Validate request body
    const validation = calendar-syncConnectionsSchema.safeParse(body);
    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request data',
        validation.error.errors
      );
    }
    
    const { provider } = validation.data;
      const { provider } = body;

      if (!provider || !['google', 'microsoft'].includes(provider)) {
        return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid provider. Must be '
    );
      }

      // Return OAuth URL for client to redirect to
      const authUrl = `/api/calendar-sync/${provider}/auth`;

      return NextResponse.json({
        message: 'Redirect to authorization URL',
        authUrl,
      });
    } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to create connection',
      error
    );
    }
    })(request);
};

