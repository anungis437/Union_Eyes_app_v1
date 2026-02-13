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
      // DUPLICATE REMOVED:       const { searchParams } = new URL(request.url);
      // DUPLICATE REMOVED:       const trustBoardId = searchParams.get('trustBoardId');
      // DUPLICATE REMOVED:       const activeOnly = searchParams.get('activeOnly') === 'true';
      // DUPLICATE REMOVED: 
      // DUPLICATE REMOVED:       if (!trustBoardId) {
      // DUPLICATE REMOVED:         return standardErrorResponse(
      // DUPLICATE REMOVED:       ErrorCode.MISSING_REQUIRED_FIELD,
      // DUPLICATE REMOVED:       'Bad Request - trustBoardId is required'
      // DUPLICATE REMOVED:     );
      // DUPLICATE REMOVED:       }
      // DUPLICATE REMOVED: 
      // DUPLICATE REMOVED:       const conditions = [eq(pensionTrustees.trusteeBoardId, trustBoardId)];
      // DUPLICATE REMOVED:       
      // DUPLICATE REMOVED:       if (activeOnly) {
      // DUPLICATE REMOVED:         conditions.push(eq(pensionTrustees.isCurrent, true));
      // DUPLICATE REMOVED:       }
      // DUPLICATE REMOVED: 
      // DUPLICATE REMOVED:       const whereClause = conditions.length > 1 
      // DUPLICATE REMOVED:         ? sql.join(conditions, sql.raw(' AND '))
      // DUPLICATE REMOVED:         : conditions[0];
      // DUPLICATE REMOVED: 
      // DUPLICATE REMOVED:       const trustees = await db
      // DUPLICATE REMOVED:         .select()
      // DUPLICATE REMOVED:         .from(pensionTrustees)
      // DUPLICATE REMOVED:         .where(whereClause);
      // DUPLICATE REMOVED: 
      // DUPLICATE REMOVED:       return NextResponse.json({
      // DUPLICATE REMOVED:         success: true,
      // DUPLICATE REMOVED:         data: trustees,
      // DUPLICATE REMOVED:         count: trustees.length,
      // DUPLICATE REMOVED:       });
      // DUPLICATE REMOVED: 
      // DUPLICATE REMOVED:     } catch (error) {
      // DUPLICATE REMOVED:       logger.error('Failed to fetch trustees', error as Error, {
      // DUPLICATE REMOVED:         userId,
      // DUPLICATE REMOVED:         trustBoardId: request.nextUrl.searchParams.get('trustBoardId'),
      // DUPLICATE REMOVED:         correlationId: request.headers.get('x-correlation-id'),
      // DUPLICATE REMOVED:   });
      // DUPLICATE REMOVED:     return standardErrorResponse(
      // DUPLICATE REMOVED:       ErrorCode.INTERNAL_ERROR,
      // DUPLICATE REMOVED:       'Internal Server Error',
      // DUPLICATE REMOVED:       error
      // DUPLICATE REMOVED:     );
      // DUPLICATE REMOVED:   }
      // DUPLICATE REMOVED:   })(request);
      // DUPLICATE REMOVED: };
      // DUPLICATE REMOVED: 
      // DUPLICATE REMOVED: 
      // DUPLICATE REMOVED: const pensionTrusteesSchema = z.object({
      // DUPLICATE REMOVED:   trustBoardId: z.string().uuid('Invalid trustBoardId'),
      // DUPLICATE REMOVED:   userId: z.string().uuid('Invalid userId'),
      // DUPLICATE REMOVED:   trusteeName: z.string().min(1, 'trusteeName is required'),
      // DUPLICATE REMOVED:   trusteeType: z.unknown().optional(), // 'employer' | 'union' | 'independent'
      // DUPLICATE REMOVED:   position: z.string().min(1, 'position is required'),
      // DUPLICATE REMOVED:   termStartDate: z.string().datetime().optional(),
      // DUPLICATE REMOVED:   termEndDate: z.string().datetime().optional(),
      // DUPLICATE REMOVED:   termLengthYears: z.unknown().optional().default(3),
      // DUPLICATE REMOVED:   isVotingMember: z.boolean().optional().default(true),
      // DUPLICATE REMOVED:   representingOrganization: z.unknown().optional(),
      // DUPLICATE REMOVED:   representingOrganizationId: z.string().uuid('Invalid representingOrganizationId'),
      // DUPLICATE REMOVED:   email: z.string().email('Invalid email address'),
      // DUPLICATE REMOVED:   phone: z.string().min(10, 'Invalid phone number'),
      // DUPLICATE REMOVED:   notes: z.string().optional(),
      // DUPLICATE REMOVED: });
      // DUPLICATE REMOVED: 
      // DUPLICATE REMOVED: export const POST = async (request: NextRequest) => {
      // DUPLICATE REMOVED:   return withEnhancedRoleAuth(20, async (request, context) => {
      // DUPLICATE REMOVED:     const { userId, organizationId } = context;
      // DUPLICATE REMOVED: 
      // DUPLICATE REMOVED:   try {
      // DUPLICATE REMOVED:       if (!userId) {
      // DUPLICATE REMOVED:         return standardErrorResponse(
      // DUPLICATE REMOVED:       ErrorCode.AUTH_REQUIRED,
      // DUPLICATE REMOVED:       'Unauthorized - Authentication required'
      // DUPLICATE REMOVED:     );
      // DUPLICATE REMOVED:       }
      // DUPLICATE REMOVED: 
      // DUPLICATE REMOVED:       const body = await request.json();
      // DUPLICATE REMOVED:     // Validate request body
      // DUPLICATE REMOVED:     const validation = pensionTrusteesSchema.safeParse(body);
      // DUPLICATE REMOVED:     if (!validation.success) {
      // DUPLICATE REMOVED:       return standardErrorResponse(
      // DUPLICATE REMOVED:         ErrorCode.VALIDATION_ERROR,
      // DUPLICATE REMOVED:         'Invalid request data',
      // DUPLICATE REMOVED:         validation.error.errors
      // DUPLICATE REMOVED:       );
      // DUPLICATE REMOVED:     }
      // DUPLICATE REMOVED:     
      // DUPLICATE REMOVED:     const { trustBoardId, userId, trusteeName, trusteeType, // 'employer' | 'union' | 'independent'
      // DUPLICATE REMOVED:         position, termStartDate, termEndDate, termLengthYears = 3, isVotingMember = true, representingOrganization, representingOrganizationId, email, phone, notes } = validation.data;
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

