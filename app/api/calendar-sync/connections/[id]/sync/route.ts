import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * Manual Calendar Sync Trigger API
 * 
 * POST /api/calendar-sync/connections/[id]/sync
 * Manually trigger sync for a specific connection
 * 
 * @module api/calendar-sync/connections/[id]/sync
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { externalCalendarConnections } from '@/db/schema/calendar-schema';
import { eq, and } from 'drizzle-orm';
import {
  importGoogleEvents,
  getSyncToken,
} from '@/lib/external-calendar-sync/google-calendar-service';
import {
  importMicrosoftEvents,
  getDeltaLink,
} from '@/lib/external-calendar-sync/microsoft-calendar-service';
import { z } from "zod";
import { withEnhancedRoleAuth } from "@/lib/api-auth-guard";

export const POST = async (request: NextRequest, { params }: { params: { id: string } }) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      const connectionId = params.id;

      // Get connection
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
        return NextResponse.json(
          { error: 'Connection not found' },
          { status: 404 }
        );
      }

      if (!connection.syncEnabled) {
        return NextResponse.json(
          { error: 'Sync is disabled for this connection' },
          { status: 400 }
        );
      }

      // Get request body
      const body = await request.json();
      const { 
        localCalendarId, 
        externalCalendarId,
        timeMin,
        timeMax,
      } = body;

      if (!localCalendarId || !externalCalendarId) {
        return NextResponse.json(
          { error: 'localCalendarId and externalCalendarId are required' },
          { status: 400 }
        );
      }

      // Update sync status
      await db
        .update(externalCalendarConnections)
        .set({
          syncStatus: 'pending',
          updatedAt: new Date(),
        })
        .where(eq(externalCalendarConnections.id, connectionId));

      let result;

      try {
        if (connection.provider === 'google') {
          const syncToken = getSyncToken(connection, externalCalendarId);
          
          result = await importGoogleEvents(
            connectionId,
            localCalendarId,
            externalCalendarId,
            {
              syncToken: syncToken || undefined,
              timeMin: timeMin ? new Date(timeMin) : undefined,
              timeMax: timeMax ? new Date(timeMax) : undefined,
            }
          );
        } else if (connection.provider === 'microsoft') {
          const deltaLink = getDeltaLink(connection, externalCalendarId);
          
          result = await importMicrosoftEvents(
            connectionId,
            localCalendarId,
            externalCalendarId,
            {
              deltaLink: deltaLink || undefined,
              timeMin: timeMin ? new Date(timeMin) : undefined,
              timeMax: timeMax ? new Date(timeMax) : undefined,
            }
          );
        } else {
          throw new Error('Unsupported provider');
        }

        // Update sync status to success
        await db
          .update(externalCalendarConnections)
          .set({
            syncStatus: 'synced',
            lastSyncAt: new Date(),
            syncError: null,
            updatedAt: new Date(),
          })
          .where(eq(externalCalendarConnections.id, connectionId));

        return NextResponse.json({
          message: 'Sync completed successfully',
          result,
        });
      } catch (syncError) {
        // Update sync status to failed
        await db
          .update(externalCalendarConnections)
          .set({
            syncStatus: 'failed',
            syncError: syncError instanceof Error ? syncError.message : 'Sync failed',
            updatedAt: new Date(),
          })
          .where(eq(externalCalendarConnections.id, connectionId));

        throw syncError;
      }
    } catch (error) {
return NextResponse.json(
        {
          error: 'Failed to sync calendar',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
    })(request, { params });
};
