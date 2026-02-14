import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * Individual Calendar Sync Connection Management API
 * 
 * Endpoints:
 * - GET /api/calendar-sync/connections/[id] - Get connection details
 * - PATCH /api/calendar-sync/connections/[id] - Update sync settings
 * - DELETE /api/calendar-sync/connections/[id] - Disconnect external calendar
 * - POST /api/calendar-sync/connections/[id]/sync - Trigger manual sync
 * 
 * @module api/calendar-sync/connections/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { externalCalendarConnections } from '@/db/schema/calendar-schema';
import { and } from 'drizzle-orm';
import {
  importGoogleEvents,
  listGoogleCalendars,
  getSyncToken,
} from '@/lib/external-calendar-sync/google-calendar-service';
import {
  importMicrosoftEvents,
  listMicrosoftCalendars,
  getDeltaLink,
} from '@/lib/external-calendar-sync/microsoft-calendar-service';
import { z } from "zod";
import { withApiAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';

import { standardSuccessResponse } from '@/lib/api/standardized-responses';
export const GET = async (request: NextRequest, { params }: { params: { id: string } }) => {
  return withRoleAuth(10, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      const connectionId = params.id;

      const [connection] = await db
        .select()
        .from(externalCalendarConnections)
        .where(
          and(
            eq(externalCalendarConnections.id, connectionId),
            eq(externalCalendarConnections.userId, userId)
          )
        )
        .limit(1);

      if (!connection) {
        return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Connection not found'
    );
      }

      // Fetch available calendars from provider
      let availableCalendars = [];
      try {
        if (connection.provider === 'google') {
          availableCalendars = await listGoogleCalendars(connectionId);
        } else if (connection.provider === 'microsoft') {
          availableCalendars = await listMicrosoftCalendars(connectionId);
        }
      } catch (error) {
}

      return NextResponse.json({
        connection: {
          id: connection.id,
          provider: connection.provider,
          providerAccountId: connection.providerAccountId,
          syncEnabled: connection.syncEnabled,
          syncDirection: connection.syncDirection,
          syncStatus: connection.syncStatus,
          lastSyncAt: connection.lastSyncAt,
          syncError: connection.syncError,
          calendarMappings: connection.calendarMappings,
          createdAt: connection.createdAt,
          updatedAt: connection.updatedAt,
        },
        availableCalendars,
      });
    } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch connection',
      error
    );
    }
    })(request, { params });
};


const calendarSyncConnectionsSchema = z.object({
  syncEnabled: z.boolean().optional(),
  syncDirection: z.unknown().optional(),
  calendarMappings: z.unknown().optional(),
});

export const PATCH = async (request: NextRequest, { params }: { params: { id: string } }) => {
  return withRoleAuth(20, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      const connectionId = params.id;
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
    
    const { syncEnabled, syncDirection, calendarMappings } = validation.data;
      const { syncEnabled, syncDirection, calendarMappings } = body;

      // Verify ownership
      const [connection] = await db
        .select()
        .from(externalCalendarConnections)
        .where(
          and(
            eq(externalCalendarConnections.id, connectionId),
            eq(externalCalendarConnections.userId, userId)
          )
        )
        .limit(1);

      if (!connection) {
        return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Connection not found'
    );
      }

      // Update connection
      const [updated] = await db
        .update(externalCalendarConnections)
        .set({
          ...(syncEnabled !== undefined && { syncEnabled }),
          ...(syncDirection && { syncDirection }),
          ...(calendarMappings && { calendarMappings }),
          updatedAt: new Date(),
        })
        .where(eq(externalCalendarConnections.id, connectionId))
        .returning();

      return NextResponse.json({
        message: 'Connection updated successfully',
        connection: updated,
      });
    } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to update connection',
      error
    );
    }
    })(request, { params });
};

export const DELETE = async (request: NextRequest, { params }: { params: { id: string } }) => {
  return withRoleAuth(20, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      const connectionId = params.id;

      // Verify ownership
      const [connection] = await db
        .select()
        .from(externalCalendarConnections)
        .where(
          and(
            eq(externalCalendarConnections.id, connectionId),
            eq(externalCalendarConnections.userId, userId)
          )
        )
        .limit(1);

      if (!connection) {
        return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Connection not found'
    );
      }

      // Delete connection
      await db
        .delete(externalCalendarConnections)
        .where(eq(externalCalendarConnections.id, connectionId));

      return NextResponse.json({
        message: 'Connection deleted successfully',
      });
    } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to delete connection',
      error
    );
    }
    })(request, { params });
};
