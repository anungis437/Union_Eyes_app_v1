/**
 * Google Calendar OAuth Authorization
 * 
 * Initiates the OAuth flow by redirecting to Google's authorization page.
 * 
 * @module api/calendar-sync/google/auth
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getAuthorizationUrl } from '@/lib/external-calendar-sync/google-calendar-service';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generate authorization URL with userId as state
    const authUrl = getAuthorizationUrl(userId);

    // Redirect to Google authorization page
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Google auth initiation error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Google Calendar authorization' },
      { status: 500 }
    );
  }
}
