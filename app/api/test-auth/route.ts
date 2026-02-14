import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { NextResponse } from 'next/server';
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';
import { ErrorCode } from '@/lib/api/standardized-responses';

export const dynamic = 'force-dynamic';

export const GET = async () => {
  return withEnhancedRoleAuth(10, async (request, context) => {
    try {
      const authResult = {
        userId: context.userId,
        sessionId: null,
        organizationId: context.organizationId,
      };
return NextResponse.json({
        success: true,
        userId: authResult.userId,
        sessionId: authResult.sessionId,
        hasSession: !!authResult.sessionId,
        message: authResult.userId ? 'Authenticated' : 'Not authenticated',
      });
    } catch (error) {
return standardErrorResponse(ErrorCode.INTERNAL_ERROR);
    }
    })(request);
};

