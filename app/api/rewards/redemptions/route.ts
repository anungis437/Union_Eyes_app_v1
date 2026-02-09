import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { NextRequest, NextResponse } from 'next';
import { db } from '@/db';
import {
  initiateRedemption,
  cancelRedemption,
  listUserRedemptions,
} from '@/lib/services/rewards/redemption-service';
import { redemptionInitiateSchema } from '@/lib/validation/rewards-schemas';
import { z } from 'zod';
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { NextResponse } from "next/server";

export const GET = async (request: NextRequest) => {
  return withRoleAuth(10, async (request, context) => {
  try {
      // 1. Authenticate
      const { userId, organizationId } = context;
      
      if (!organizationId) {
        return NextResponse.json(
          { error: 'Organization context required' },
          { status: 400 }
        );
      }

      // 2. Parse query parameters
      const { searchParams } = new URL(request.url);
      const status = searchParams.get('status') || undefined;
      const limit = Math.min(
        parseInt(searchParams.get('limit') || '20', 10),
        100
      );
      const offset = parseInt(searchParams.get('offset') || '0', 10);

      // 3. Validate status if provided
      const validStatuses = ['pending', 'ordered', 'fulfilled', 'cancelled', 'refunded'];
      if (status && !validStatuses.includes(status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
          { status: 400 }
        );
      }

      // 4. List redemptions
      const redemptions = await listUserRedemptions(
        db, userId,
        organizationId,
        {
          status: status as any,
          limit,
          offset,
        }
      );

      // 5. Return response
      return NextResponse.json(
        {
          redemptions,
          pagination: {
            limit,
            offset,
            hasMore: redemptions.length === limit,
          },
        },
        { status: 200 }
      );

    } catch (error) {
      console.error('[Redemptions API] GET error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
    })(request);
};

export const POST = async (request: NextRequest) => {
  return withRoleAuth(20, async (request, context) => {
  try {
      // 1. Authenticate
      const { userId, organizationId } = context;
      
      if (!organizationId) {
        return NextResponse.json(
          { error: 'Organization context required' },
          { status: 400 }
        );
      }

      // 2. Parse and validate request body
      const body = await request.json();
      
      let validatedData;
      try {
        validatedData = redemptionInitiateSchema.parse(body);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return NextResponse.json(
            { 
              error: 'Validation failed', 
              details: error.errors 
            },
            { status: 400 }
          );
        }
        throw error;
      }

      // 3. Initiate redemption
      const redemption = await initiateRedemption(
        db, userId,
        organizationId,
        validatedData
      );

      // 4. Return response
      return NextResponse.json(
        {
          redemption,
          message: 'Redemption initiated successfully',
        },
        { status: 201 }
      );

    } catch (error: any) {
      console.error('[Redemptions API] POST error:', error);

      // Handle specific business logic errors
      if (error.message?.includes('Insufficient credits')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
    })(request);
};

export const DELETE = async (request: NextRequest) => {
  return withRoleAuth(20, async (request, context) => {
  try {
      // 1. Authenticate
      const { userId, organizationId } = context;
      
      if (!organizationId) {
        return NextResponse.json(
          { error: 'Organization context required' },
          { status: 400 }
        );
      }

      // 2. Get redemption ID from query
      const { searchParams } = new URL(request.url);
      const redemptionId = searchParams.get('id');

      if (!redemptionId) {
        return NextResponse.json(
          { error: 'Redemption ID required' },
          { status: 400 }
        );
      }

      // 3. Cancel redemption
      const cancelledRedemption = await cancelRedemption(
        db,
        redemptionId,
        'member_cancelled'
      );

      // 4. Return response
      return NextResponse.json(
        {
          redemption: cancelledRedemption,
          message: 'Redemption cancelled and credits refunded',
        },
        { status: 200 }
      );

    } catch (error: any) {
      console.error('[Redemptions API] DELETE error:', error);

      // Handle specific business logic errors
      if (error.message?.includes('Cannot cancel')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }

      if (error.message?.includes('not found')) {
        return NextResponse.json(
          { error: 'Redemption not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
    })(request);
};
