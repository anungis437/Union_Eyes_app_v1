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
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";

export const GET = async (request: NextRequest) => {
  return withEnhancedRoleAuth(10, async (request, context) => {
    const user = { id: context.userId, organizationId: context.organizationId };

  try {
      // Generate authorization URL with user.id as state
      const authUrl = getAuthorizationUrl(user.id);

      // Redirect to Google authorization page
      return NextResponse.redirect(authUrl);
    } catch (error) {
      console.error('Google auth initiation error:', error);
      return NextResponse.json(
        { error: 'Failed to initiate Google Calendar authorization' },
        { status: 500 }
      );
    }
  })
  })(request);
};
