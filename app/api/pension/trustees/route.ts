import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * API Route: Pension Trustees
 * CRUD operations for trustee management
 * Phase 2: Pension & H&W Trust System
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { pensionTrustees } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { z } from "zod";
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
export const dynamic = 'force-dynamic';

export const GET = async (request: NextRequest) => {
  return withEnhancedRoleAuth(10, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      const { searchParams } = new URL(request.url);
      const trustBoardId = searchParams.get('trustBoardId');
      const activeOnly = searchParams.get('activeOnly') === 'true';

      if (!trustBoardId) {
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Bad Request - trustBoardId is required'
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
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Internal Server Error',
      error
    );
  }
  })(request);
};


const pensionTrusteesSchema = z.object({
  trustBoardId: z.string().uuid('Invalid trustBoardId'),
  userId: z.string().uuid('Invalid userId'),
  trusteeName: z.string().min(1, 'trusteeName is required'),
  trusteeType: z.unknown().optional(), // 'employer' | 'union' | 'independent'
  position: z.string().min(1, 'position is required'),
  termStartDate: z.string().datetime().optional(),
  termEndDate: z.string().datetime().optional(),
  termLengthYears: z.unknown().optional().default(3),
  isVotingMember: z.boolean().optional().default(true),
  representingOrganization: z.unknown().optional(),
  representingOrganizationId: z.string().uuid('Invalid representingOrganizationId'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Invalid phone number'),
  notes: z.string().optional(),
});

export const POST = async (request: NextRequest) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      if (!userId) {
        return standardErrorResponse(
      ErrorCode.AUTH_REQUIRED,
      'Unauthorized - Authentication required'
    );
      }

      const body = await request.json();
    // Validate request body
    const validation = pensionTrusteesSchema.safeParse(body);
    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request data',
        validation.error.errors
      );
    }
    
    const { trustBoardId, userId, trusteeName, trusteeType, // 'employer' | 'union' | 'independent'
        position, termStartDate, termEndDate, termLengthYears = 3, isVotingMember = true, representingOrganization, representingOrganizationId, email, phone, notes } = validation.data;
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
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Bad Request - trustBoardId, trusteeName, trusteeType, and termStartDate are required'
      // TODO: Migrate additional details: trusteeName, trusteeType, and termStartDate are required'
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
          return standardErrorResponse(
      ErrorCode.ALREADY_EXISTS,
      'Conflict - User is already an active trustee on this board'
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
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Internal Server Error',
      error
    );
  }
  })(request);
};

