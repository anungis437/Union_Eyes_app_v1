import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * Google Calendar OAuth Callback
 * 
 * Handles the OAuth callback from Google and stores the connection.
 * 
 * @module api/calendar-sync/google/callback
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { externalCalendarConnections } from '@/db/schema/calendar-schema';
import { exchangeCodeForTokens } from '@/lib/external-calendar-sync/google-calendar-service';
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';

export const GET = async (request: NextRequest) => {
  return withRoleAuth(10, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      const searchParams = request.nextUrl.searchParams;
      const code = searchParams.get('code');
      const state = searchParams.get('state'); // userId
      const error = searchParams.get('error');

      if (error) {
        return NextResponse.redirect(
          new URL(`/calendar/sync?error=${encodeURIComponent(error)}`, request.url)
        );
      }

      if (!code || !state) {
        return NextResponse.json(
          { error: 'Missing code or state parameter' },
          { status: 400 }
        );
      }

      // Verify state matches current user
      if (userId !== state) {
        return NextResponse.json(
          { error: 'Invalid state parameter' },
          { status: 400 }
        );
      }

      // Exchange code for tokens
      const { accessToken, refreshToken, expiresAt } = await exchangeCodeForTokens(code);

      // Get user's email from Google (optional, for providerAccountId)
      const providerAccountId = `google_${userId}`;

      // Store connection
      const [connection] = await db
        .insert(externalCalendarConnections)
        .values({
          userId,
          tenantId: organizationId || 'default-org',
          provider: 'google',
          providerAccountId,
          accessToken,
          refreshToken,
          tokenExpiresAt: expiresAt,
          syncEnabled: true,
          syncDirection: 'both',
          syncStatus: 'pending',
          calendarMappings: [],
        })
        .returning();

      // Redirect to success page
      return NextResponse.redirect(
        new URL(
          `/calendar/sync?success=true&provider=google&connectionId=${connection.id}`,
          request.url
        )
      );
    } catch (error) {
return NextResponse.redirect(
        new URL(
          `/calendar/sync?error=${encodeURIComponent('Failed to connect Google Calendar')}`,
          request.url
        )
      );
    }
    })(request);
};

