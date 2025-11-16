/**
 * Microsoft Outlook Calendar OAuth Callback
 * 
 * Handles the OAuth callback from Microsoft and stores the connection.
 * 
 * @module api/calendar-sync/microsoft/callback
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db/db';
import { externalCalendarConnections } from '@/db/schema/calendar-schema';
import { exchangeCodeForTokens } from '@/lib/external-calendar-sync/microsoft-calendar-service';

export async function GET(request: NextRequest) {
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

    const { userId } = await auth();
    
    // Verify state matches current user
    if (userId !== state) {
      return NextResponse.json(
        { error: 'Invalid state parameter' },
        { status: 400 }
      );
    }

    // Exchange code for tokens
    const { accessToken, refreshToken, expiresAt, accountId } = await exchangeCodeForTokens(code);

    // Store connection
    const [connection] = await db
      .insert(externalCalendarConnections)
      .values({
        userId,
        tenantId: 'default', // TODO: Get from user's organization
        provider: 'microsoft',
        providerAccountId: accountId,
        accessToken,
        refreshToken,
        tokenExpiresAt: expiresAt,
        syncEnabled: true,
        syncDirection: 'both',
        syncStatus: 'pending',
        calendarMappings: {},
      })
      .returning();

    // Redirect to success page
    return NextResponse.redirect(
      new URL(
        `/calendar/sync?success=true&provider=microsoft&connectionId=${connection.id}`,
        request.url
      )
    );
  } catch (error) {
    console.error('Microsoft OAuth callback error:', error);
    return NextResponse.redirect(
      new URL(
        `/calendar/sync?error=${encodeURIComponent('Failed to connect Microsoft Calendar')}`,
        request.url
      )
    );
  }
}
