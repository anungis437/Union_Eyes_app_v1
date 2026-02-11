import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * API Route: Tax Slips
 * Manage tax slips (T4A, RL-1, COPE)
 * Phase 1: Tax Compliance & Financial
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { taxSlips } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { checkRateLimit, RATE_LIMITS, createRateLimitHeaders } from '@/lib/rate-limiter';
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
export const dynamic = 'force-dynamic';

export const GET = async (request: NextRequest) => {
  return withRoleAuth('steward', async (request, context) => {
    const { userId, organizationId } = context;

  try {
      // Rate limiting: 10 tax operations per hour per user
      const rateLimitResult = await checkRateLimit(userId, RATE_LIMITS.TAX_OPERATIONS);
      if (!rateLimitResult.allowed) {
        logger.warn('Rate limit exceeded for tax slips read', {        limit: rateLimitResult.limit,
          resetIn: rateLimitResult.resetIn,
        });
        return NextResponse.json(
          { 
            error: 'Rate limit exceeded. Too many requests.',
            resetIn: rateLimitResult.resetIn 
          },
          { 
            status: 429,
            headers: createRateLimitHeaders(rateLimitResult),
          }
        );
      }

      const { searchParams } = new URL(request.url);
      const organizationId = searchParams.get('organizationId');
  if (organizationId && organizationId !== context.organizationId) {
    return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Forbidden'
    );
  }

      const taxYear = searchParams.get('taxYear');
      const slipType = searchParams.get('slipType');
      const memberId = searchParams.get('memberId');

      if (!organizationId) {
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Bad Request - organizationId is required'
    );
      }

      // Build query conditions
      const conditions = [eq(taxSlips.organizationId, organizationId)];
      
      if (taxYear) {
        conditions.push(eq(taxSlips.taxYear, parseInt(taxYear)));
      }
      
      if (slipType) {
        conditions.push(eq(taxSlips.slipType, slipType as any));
      }
      
      if (memberId) {
        conditions.push(eq(taxSlips.memberId, memberId));
      }

      // Fetch tax slips
      const slips = await db
        .select()
        .from(taxSlips)
        .where(and(...conditions))
        .orderBy(desc(taxSlips.taxYear), desc(taxSlips.createdAt));

      return NextResponse.json({
        success: true,
        data: slips,
        count: slips.length,
        filters: {        taxYear: taxYear ? parseInt(taxYear) : null,
          slipType,
          memberId,
        },
      });

    } catch (error) {
      const { searchParams } = new URL(request.url);
      logger.error('Failed to fetch tax slips', error as Error, {
        userId: userId,
        organizationId: searchParams.get('organizationId'),
        slipType: searchParams.get('slipType'),
        correlationId: request.headers.get('x-correlation-id'),
  });
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Internal Server Error',
      error
    );
  }
  })(request);
};

