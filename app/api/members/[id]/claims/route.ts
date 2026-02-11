/**
 * API Route: Get Member Claims
 * Fetch all claims associated with a specific member
 */

import { NextRequest, NextResponse } from 'next/server';
import { withRoleAuth } from '@/lib/role-middleware';
import { db } from '@/db/db';
import { claims } from '@/db/schema/domains/claims';
import { eq, and, desc } from 'drizzle-orm';

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
export const dynamic = 'force-dynamic';

// Members can view their own claims, stewards+ can view all claims
export const GET = withRoleAuth('member', async (request: NextRequest, context, params?: { id: string }) => {
  try {
    const { organizationId } = context;
    const memberId = params?.id as string;

    if (!memberId) {
      return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Member ID is required'
    );
    }

    // Fetch claims where this member is the claimant (member_id)
    const memberClaims = await db
      .select()
      .from(claims)
      .where(
        and(
          eq(claims.organizationId, organizationId),
          eq(claims.memberId, memberId)
        )
      )
      .orderBy(desc(claims.createdAt));

    return NextResponse.json({
      success: true,
      data: memberClaims,
    });
  } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch member claims',
      error
    );
  }
});
