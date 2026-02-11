import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * API Route: Single Pension Plan
 * Get, update, or delete a specific pension plan
 * Phase 1: Pension & Health/Welfare
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { pensionPlans } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { z } from "zod";
import { withEnhancedRoleAuth } from "@/lib/api-auth-guard";

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
export const dynamic = 'force-dynamic';

export const GET = async (request: NextRequest, { params }: { params: { id: string } }) => {
  return withEnhancedRoleAuth(10, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      const { id } = params;

      const [plan] = await db
        .select()
        .from(pensionPlans)
        .where(eq(pensionPlans.id, id))
        .limit(1);

      if (!plan) {
        return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Not Found - Pension plan not found'
    );
      }

      return NextResponse.json({
        success: true,
        data: plan,
      });

    } catch (error) {
      logger.error('Failed to fetch pension plan', error as Error, {
        planId: params.id,
        userId,
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
  return withEnhancedRoleAuth(20, async (request, context) => {
    const { userId, organizationId } = context;

  let userId: string | null = null;
    try {
      const { id } = params;
      const body = await request.json();

      // Update pension plan
      const [updatedPlan] = await db
        .update(pensionPlans)
        .set({
          ...body,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(pensionPlans.id, id))
        .returning();

      if (!updatedPlan) {
        return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Not Found - Pension plan not found'
    );
      }

      return NextResponse.json({
        success: true,
        data: updatedPlan,
        message: 'Pension plan updated successfully',
      });

    } catch (error) {
      logger.error('Failed to update pension plan', error as Error, {
        planId: params.id,
        userId,
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
  return withEnhancedRoleAuth(20, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      const { id } = params;

      // Soft delete by setting planStatus = 'closed'
      const [deletedPlan] = await db
        .update(pensionPlans)
        .set({
          planStatus: 'closed',
          updatedAt: new Date().toISOString(),
        })
        .where(eq(pensionPlans.id, id))
        .returning();

      if (!deletedPlan) {
        return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Not Found - Pension plan not found'
    );
      }

      return NextResponse.json({
        success: true,
        message: 'Pension plan deleted successfully',
      });

    } catch (error) {
      logger.error('Failed to delete pension plan', error as Error, {
        planId: params.id,
        userId,
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
