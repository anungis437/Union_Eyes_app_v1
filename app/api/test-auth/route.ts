import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { NextResponse } from 'next/server';
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";

export const dynamic = 'force-dynamic';

export const GET = async () => {
  return withEnhancedRoleAuth(10, async (request, context) => {
    const user = { id: context.userId, organizationId: context.organizationId };

  try {
      const authResult = await auth();
      
      console.log('[API /api/test-auth] Full auth result:', {
        user.id: authResult.user.id,
        sessionId: authResult.sessionId,
        orgId: authResult.orgId,
        hasSession: !!authResult.sessionId,
      });
      
      return NextResponse.json({
        success: true,
        user.id: authResult.user.id,
        sessionId: authResult.sessionId,
        hasSession: !!authResult.sessionId,
        message: authResult.user.id ? 'Authenticated' : 'Not authenticated',
      });
    } catch (error) {
      console.error('[API /api/test-auth] Error:', error);
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, { status: 500 });
    }
  })
  })(request);
};
