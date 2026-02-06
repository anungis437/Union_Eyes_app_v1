/**
 * Microsoft Outlook Calendar OAuth Authorization
 * 
 * Initiates the OAuth flow by redirecting to Microsoft's authorization page.
 * 
 * @module api/calendar-sync/microsoft/auth
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getAuthorizationUrl } from '@/lib/external-calendar-sync/microsoft-calendar-service';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generate authorization URL with userId as state
    const authUrl = await getAuthorizationUrl(userId);

    // Redirect to Microsoft authorization page
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Microsoft auth initiation error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Microsoft Calendar authorization' },
      { status: 500 }
    );
  }
}
