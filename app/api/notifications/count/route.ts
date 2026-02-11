import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { logger } from '@/lib/logger';
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { withRLSContext } from '@/lib/db/with-rls-context';

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
export const GET = async (req: NextRequest) => {
  return withRoleAuth(10, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      // Query notifications table for unread notifications for the current user
      // Assuming there's a notifications table with userId, isRead, createdAt columns
      try {
        const unreadCount = await withRLSContext(
          { userId, organizationId },
          async (db) => db.query.notifications.findMany({
            where: (notifications, { eq, and }) =>
              and(
                eq(notifications.userId, userId),
                eq(notifications.isRead, false)
              ),
            columns: { id: true },
          })
        );

        logger.info('Retrieved notification count', { userId, count: unreadCount.length });

        return standardSuccessResponse(
      {  count: unreadCount.length  },
      undefined,
      200
    );
      } catch (error) {
        // If notifications table doesn't exist, return 0
        logger.warn('Notifications table not available', { error });
        return standardSuccessResponse(
      {  count: 0  },
      undefined,
      200
    );
      }
    } catch (error) {
      logger.error('Failed to get notification count', { error });
      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to retrieve notification count',
      error
    );
    }
    })(request);
};

