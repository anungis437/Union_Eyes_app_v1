import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * API Route: Organizing Campaigns
 * Manage organizing campaigns for union certification
 * Phase 3: Organizing & Certification
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { organizingCampaigns } from '@/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { z } from "zod";
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
export const dynamic = 'force-dynamic';

export const GET = async (request: NextRequest) => {
  return withRoleAuth(10, async (request, context) => {
  try {
      const { searchParams } = new URL(request.url);
      const organizationId = searchParams.get('organizationId');
      const status = searchParams.get('status');

      if (!organizationId) {
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Bad Request - organizationId is required'
    );
      }

      // Build query conditions
      const conditions = [eq(organizingCampaigns.organizationId, organizationId)];
      
      if (status) {
        conditions.push(eq(organizingCampaigns.campaignStatus, status as any));
      }

      // Fetch campaigns
      const campaigns = await db
        .select()
        .from(organizingCampaigns)
        .where(and(...conditions))
        .orderBy(desc(organizingCampaigns.campaignLaunchDate));

      return NextResponse.json({
        success: true,
        data: campaigns,
        count: campaigns.length,
      });

    } catch (error) {
      logger.error('Failed to fetch organizing campaigns', error as Error, {      organizationId: request.nextUrl.searchParams.get('organizationId'),
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


const organizingCampaignsSchema = z.object({
  organizationId: z.string().uuid('Invalid organizationId'),
  campaignName: z.string().min(1, 'campaignName is required'),
  campaignCode: z.unknown().optional(),
  campaignType: z.unknown().optional(),
  targetEmployerName: z.string().min(1, 'targetEmployerName is required'),
  estimatedEligibleWorkers: z.unknown().optional(),
  laborBoardJurisdiction: z.boolean().optional(),
});

export const POST = async (request: NextRequest) => {
  return withRoleAuth(20, async (request, context) => {
  try {
      const body = await request.json();
    // Validate request body
    const validation = organizingCampaignsSchema.safeParse(body);
    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request data',
        validation.error.errors
      );
    }
    
    const { organizationId, campaignName, campaignCode, campaignType, targetEmployerName, estimatedEligibleWorkers, laborBoardJurisdiction } = validation.data;
    // DUPLICATE REMOVED (Phase 2): Multi-line destructuring of body
    // const {
    // organizationId,
    // campaignName,
    // campaignCode,
    // campaignType,
    // targetEmployerName,
    // estimatedEligibleWorkers,
    // laborBoardJurisdiction,
    // } = body;
  if (organizationId && organizationId !== context.organizationId) {
    return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Forbidden'
    );
  }


      // Validate required fields
      if (!organizationId || !campaignName || !campaignCode || !campaignType || !targetEmployerName) {
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Bad Request - organizationId, campaignName, campaignCode, campaignType, and targetEmployerName are required'
      // TODO: Migrate additional details: campaignName, campaignCode, campaignType, and targetEmployerName are required'
    );
      }

      // Create campaign
      const [newCampaign] = await db
        .insert(organizingCampaigns)
        .values({
          organizationId,
          campaignName,
          campaignCode,
          campaignType,
          targetEmployerName,
          estimatedEligibleWorkers,
          laborBoardJurisdiction,
          campaignStatus: 'research',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .returning();

      return standardSuccessResponse(
      { data: newCampaign,
        message: 'Organizing campaign created successfully', },
      undefined,
      201
    );

    } catch (error) {
      logger.error('Failed to create organizing campaign', error as Error, {      correlationId: request.headers.get('x-correlation-id'),
      });
      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Internal Server Error',
      error
    );
    }
    })(request);
};
