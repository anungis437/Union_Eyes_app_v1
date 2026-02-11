import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * API Route: GET /api/notifications
 * 
 * Get in-app notifications for current user
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { inAppNotifications } from '@/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';
import { withRLSContext } from '@/lib/db/with-rls-context';

export const GET = async (request: NextRequest) => {
  return withEnhancedRoleAuth(10, async (request, context) => {
  try {
      // Get query parameters
      const searchParams = request.nextUrl.searchParams;
      const unreadOnly = searchParams.get('unreadOnly') === 'true';
      const organizationId = (searchParams.get('organizationId') ?? searchParams.get('tenantId'));
      const tenantId = organizationId; // Add tenantId filter
      const limit = parseInt(searchParams.get('limit') || '50');

      // Build base where conditions
      const baseConditions = [eq(inAppNotifications.userId, context.userId)];
      
      // Add tenant filter if provided
      if (tenantId) {
        baseConditions.push(eq(inAppNotifications.tenantId, tenantId));
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

      // Get unread count with tenant filter
      const unreadCountConditions = [
        eq(inAppNotifications.userId, context.userId),
        eq(inAppNotifications.read, false),
      ];
      
      if (tenantId) {
        unreadCountConditions.push(eq(inAppNotifications.tenantId, tenantId));
      }

      const unreadCount = await withRLSContext({ organizationId: context.organizationId }, async (db) => {
        return await db
          .select({ count: sql<number>`count(*)` })
          .from(inAppNotifications)
          .where(and(...unreadCountConditions));
      });

      return NextResponse.json({
        notifications,
        unreadCount: unreadCount[0]?.count || 0,
      });
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
    })(request);
};

