import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * API Route: Single Pension Trustee
 * Get, update, or remove a specific trustee
 * Phase 2: Pension & H&W Trust System
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { pensionTrustees } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { z } from "zod";
import { withApiAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';

import { standardSuccessResponse } from '@/lib/api/standardized-responses';
export const dynamic = 'force-dynamic';

export const GET = async (request: NextRequest, { params }: { params: { id: string } }) => {
  return withRoleAuth(10, async (request, context) => {
    const { userId } = context;

    try {
      const trustee = await db
        .select()
        .from(pensionTrustees)
        .where(eq(pensionTrustees.id, params.id))
        .limit(1);

      if (!trustee || trustee.length === 0) {
        return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Not Found - Trustee not found'
    );
      }

      return NextResponse.json({
        success: true,
        data: trustee[0],
      });

    } catch (error) {
      logger.error('Failed to fetch trustee', error as Error, {
        userId: userId,
        trusteeId: params.id,
        correlationId: request.headers.get('x-correlation-id'),
  });
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Internal Server Error',
      error
    );
  }
  })(request, { params });
};

export const PATCH = async (request: NextRequest, { params }: { params: { id: string } }) => {
  return withRoleAuth(20, async (request, context) => {
    const { userId } = context;

    try {
      const body = await request.json();
      const updates = {
        ...body,
        updatedAt: new Date(),
      };

      // Remove fields that shouldn't be updated
      delete updates.id;
      delete updates.createdAt;
      delete updates.trustBoardId; // Can&apos;t change board
      delete updates.memberId; // Can&apos;t change member

      const result = await db
        .update(pensionTrustees)
        .set(updates)
        .where(eq(pensionTrustees.id, params.id))
        .returning();

      if (!result || result.length === 0) {
        return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Not Found - Trustee not found'
    );
      }

      return NextResponse.json({
        success: true,
        data: result[0],
        message: 'Trustee updated successfully',
      });

    } catch (error) {
      logger.error('Failed to update trustee', error as Error, {
        userId: userId,
        trusteeId: params.id,
        correlationId: request.headers.get('x-correlation-id'),
  });
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Internal Server Error',
      error
    );
  }
  })(request, { params });
};

export const DELETE = async (request: NextRequest, { params }: { params: { id: string } }) => {
  return withRoleAuth(20, async (request, context) => {
    const { userId } = context;

    try {
      // Soft delete: update status instead of hard delete
      const result = await db
        .update(pensionTrustees)
        .set({
          isCurrent: false,
          termEndDate: new Date().toISOString().split('T')[0],
          updatedAt: new Date().toISOString(),
        })
        .where(eq(pensionTrustees.id, params.id))
        .returning();

      if (!result || result.length === 0) {
        return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Not Found - Trustee not found'
    );
      }

      return NextResponse.json({
        success: true,
        message: 'Trustee removed from board successfully',
      });

    } catch (error) {
      logger.error('Failed to remove trustee', error as Error, {
        userId: userId,
        trusteeId: params.id,
        correlationId: request.headers.get('x-correlation-id'),
  });
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Internal Server Error',
      error
    );
  }
  })(request, { params });
};
