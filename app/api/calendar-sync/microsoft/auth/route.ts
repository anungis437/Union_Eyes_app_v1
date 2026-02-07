import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * Microsoft Outlook Calendar OAuth Authorization
 * 
 * Initiates the OAuth flow by redirecting to Microsoft's authorization page.
 * 
 * @module api/calendar-sync/microsoft/auth
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthorizationUrl } from '@/lib/external-calendar-sync/microsoft-calendar-service';
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";

export const GET = async (request: NextRequest) => {
  return withEnhancedRoleAuth(10, async (request, context) => {
    const user = { id: context.userId, organizationId: context.organizationId };

  try {
      // Generate authorization URL with user.id as state
      const authUrl = await getAuthorizationUrl(user.id);

      // Redirect to Microsoft authorization page
      return NextResponse.redirect(authUrl);
    } catch (error) {
      console.error('Microsoft auth initiation error:', error);
      return NextResponse.json(
        { error: 'Failed to initiate Microsoft Calendar authorization' },
        { status: 500 }
      );
    }
  })
  })(request);
};
