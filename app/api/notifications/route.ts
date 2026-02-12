import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * API Route: GET /api/notifications
 * 
 * Get in-app notifications for current user
 * Updated: Feb 2026 - Migrated to standardized error responses
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { inAppNotifications } from '@/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';
import { withRLSContext } from '@/lib/db/with-rls-context';
import { standardErrorResponse, standardSuccessResponse, ErrorCode } from '@/lib/api/standardized-responses';

export const GET = async (request: NextRequest) => {
  return withEnhancedRoleAuth(10, async (request, context) => {
  try {
      // Get query parameters
      const searchParams = request.nextUrl.searchParams;
      const unreadOnly = searchParams.get('unreadOnly') === 'true';
      const organizationId = searchParams.get('organizationId');
      const limit = parseInt(searchParams.get('limit') || '50');

      // Build base where conditions
      const baseConditions = [eq(inAppNotifications.userId, context.userId)];
      
      // Add organization filter if provided
      if (organizationId) {
        baseConditions.push(eq(inAppNotifications.organizationId, organizationId));
      }

      // Build query with optional unreadOnly filter
      const whereConditions = unreadOnly 
        ? [...baseConditions, eq(inAppNotifications.read, false)]
        : baseConditions;

      const notifications = await withRLSContext({ organizationId: context.organizationId }, async (db) => {
        return await db
          .select()
          .from(inAppNotifications)
          .where(and(...whereConditions))
          .orderBy(desc(inAppNotifications.createdAt))
          .limit(limit);
      });

      // Get unread count with organization filter
      const unreadCountConditions = [
        eq(inAppNotifications.userId, context.userId),
        eq(inAppNotifications.read, false),
      ];
      
      if (organizationId) {
        unreadCountConditions.push(eq(inAppNotifications.organizationId, organizationId));
      }

      const unreadCount = await withRLSContext({ organizationId: context.organizationId }, async (db) => {
        return await db
          .select({ count: sql<number>`count(*)` })
          .from(inAppNotifications)
          .where(and(...unreadCountConditions));
      });

      return standardSuccessResponse({
        notifications,
        unreadCount: unreadCount[0]?.count || 0,
      });
    } catch (error) {
      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        'Failed to fetch notifications'
      );
    }
    })(request);
};

