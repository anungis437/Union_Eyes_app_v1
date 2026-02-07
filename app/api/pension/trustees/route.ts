import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * API Route: Pension Trustees
 * CRUD operations for trustee management
 * Phase 2: Pension & H&W Trust System
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { pensionTrustees } from '@/db/migrations/schema';
import { eq, and, sql } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { z } from "zod";
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";

export const dynamic = 'force-dynamic';

export const GET = async (request: NextRequest) => {
  return withEnhancedRoleAuth(10, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      const { searchParams } = new URL(request.url);
      const trustBoardId = searchParams.get('trustBoardId');
      const activeOnly = searchParams.get('activeOnly') === 'true';

      if (!trustBoardId) {
        return NextResponse.json(
          { error: 'Bad Request - trustBoardId is required' },
          { status: 400 }
        );
      }

      const conditions = [eq(pensionTrustees.trusteeBoardId, trustBoardId)];
      
      if (activeOnly) {
        conditions.push(eq(pensionTrustees.isCurrent, true));
      }

      const whereClause = conditions.length > 1 
        ? sql.join(conditions, sql.raw(' AND '))
        : conditions[0];

      const trustees = await db
        .select()
        .from(pensionTrustees)
        .where(whereClause);

      return NextResponse.json({
        success: true,
        data: trustees,
        count: trustees.length,
      });

    } catch (error) {
      logger.error('Failed to fetch trustees', error as Error, {
        userId,
        trustBoardId: request.nextUrl.searchParams.get('trustBoardId'),
        correlationId: request.headers.get('x-correlation-id'),
  });
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
  })(request);
};

export const POST = async (request: NextRequest) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      if (!userId) {
        return NextResponse.json(
          { error: 'Unauthorized - Authentication required' },
          { status: 401 }
        );
      }

      const body = await request.json();
      const {
        trustBoardId,
        userId: trusteeUserId,
        trusteeName,
        trusteeType, // 'employer' | 'union' | 'independent'
        position,
        termStartDate,
        termEndDate,
        termLengthYears = 3,
        isVotingMember = true,
        representingOrganization,
        representingOrganizationId,
        email,
        phone,
        notes,
      } = body;

      // Validate required fields
      if (!trustBoardId || !trusteeName || !trusteeType || !termStartDate) {
        return NextResponse.json(
          { error: 'Bad Request - trustBoardId, trusteeName, trusteeType, and termStartDate are required' },
          { status: 400 }
        );
      }

      // Check if user already a trustee on this board (if user.id provided)
      if (trusteeUserId) {
        const existing = await db
          .select()
          .from(pensionTrustees)
          .where(
            and(
              eq(pensionTrustees.trusteeBoardId, trustBoardId),
              eq(pensionTrustees.userId, trusteeUserId),
              eq(pensionTrustees.isCurrent, true)
            )
          )
          .limit(1);

        if (existing && existing.length > 0) {
          return NextResponse.json(
            { error: 'Conflict - User is already an active trustee on this board' },
            { status: 409 }
          );
        }
      }

      // Insert trustee
      const result = await db
        .insert(pensionTrustees)
        .values({
          trusteeBoardId: trustBoardId,
          userId: trusteeUserId || null,
          trusteeName,
          trusteeType,
          position: position || null,
          termStartDate: new Date(termStartDate).toISOString().split('T')[0],
          termEndDate: termEndDate ? new Date(termEndDate).toISOString().split('T')[0] : null,
          termLengthYears,
          isVotingMember,
          representingOrganization: representingOrganization || null,
          representingOrganizationId: representingOrganizationId || null,
          email: email || null,
          phone: phone || null,
          notes: notes || null,
          appointedBy: userIdAuth,
          isCurrent: true,
        })
        .returning();

      return NextResponse.json({
        success: true,
        data: result[0],
        message: 'Trustee appointed successfully',
      });

    } catch (error) {
      logger.error('Failed to appoint trustee', error as Error, {
        userId: userId,
        correlationId: request.headers.get('x-correlation-id'),
  });
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
  })(request);
};
