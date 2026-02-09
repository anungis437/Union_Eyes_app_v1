import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * Google Calendar OAuth Authorization
 * 
 * Initiates the OAuth flow by redirecting to Google's authorization page.
 * 
 * @module api/calendar-sync/google/auth
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthorizationUrl } from '@/lib/external-calendar-sync/google-calendar-service';
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';

export const GET = async (request: NextRequest) => {
  return withEnhancedRoleAuth(10, async (request, context) => {
    const { userId, organizationId } = context;

  try {
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
    })(request);
};
