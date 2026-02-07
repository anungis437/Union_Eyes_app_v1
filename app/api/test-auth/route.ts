import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { NextResponse } from 'next/server';
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";

export const dynamic = 'force-dynamic';

export const GET = async () => {
  return withEnhancedRoleAuth(10, async (request, context) => {
    try {
      const authResult = {
        userId: context.userId,
        sessionId: null,
        organizationId: context.organizationId,
      };

      console.log('[API /api/test-auth] Full auth result:', {
        userId: authResult.userId,
        sessionId: authResult.sessionId,
        orgId: authResult.organizationId,
        hasSession: !!authResult.sessionId,
      });

      return NextResponse.json({
        success: true,
        userId: authResult.userId,
        sessionId: authResult.sessionId,
        hasSession: !!authResult.sessionId,
        message: authResult.userId ? 'Authenticated' : 'Not authenticated',
      });
    } catch (error) {
      console.error('[API /api/test-auth] Error:', error);
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, { status: 500 });
    }
    })(request);
};
