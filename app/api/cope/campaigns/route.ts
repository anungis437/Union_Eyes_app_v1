import { withRLSContext } from '@/lib/db/with-rls-context';
import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * API Route: COPE Political Campaigns
 * Manage political action campaigns (electoral, legislative, GOTV)
 * Phase 3: Political Action & Electoral
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { sql } from 'drizzle-orm';
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
    const user = { id: context.userId, organizationId: context.organizationId };

  try {
      const { searchParams } = new URL(request.url);
      const organizationId = searchParams.get('organizationId');
      const campaignType = searchParams.get('campaignType');
      const campaignStatus = searchParams.get('campaignStatus');

      if (!organizationId) {
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Bad Request - organizationId is required'
    );
      }

      // Build query using sql template with embedded values
      let conditions = [sql`organization_id = ${organizationId}`];
      
      if (campaignType) {
        conditions.push(sql`campaign_type = ${campaignType}`);
      }

      if (campaignStatus) {
        conditions.push(sql`campaign_status = ${campaignStatus}`);
      }

      const whereClause = sql.join(conditions, sql.raw(' AND '));

      const result = await withRLSContext(async (tx) => {
      return await tx.execute(sql`
      SELECT 
        id,
        campaign_name,
        campaign_code,
        campaign_type,
        campaign_status,
        campaign_description,
        start_date,
        end_date,
        election_date,
        jurisdiction_level,
        jurisdiction_name,
        electoral_district,
        primary_issue,
        member_participation_goal,
        members_participated,
        doors_knocked_goal,
        doors_knocked,
        phone_calls_goal,
        phone_calls_made,
        budget_allocated,
        expenses_to_date,
        funded_by_cope,
        cope_contribution_amount,
        outcome_type,
        outcome_date,
        created_at
      FROM political_campaigns
      WHERE ${whereClause}
      ORDER BY start_date DESC NULLS LAST, created_at DESC
    `);
    });

      return NextResponse.json({
        success: true,
        data: result,
        count: result.length,
      });

    } catch (error) {
      logger.error('Failed to fetch political campaigns', error as Error, {
        organizationId: request.nextUrl.searchParams.get('organizationId'),
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


const copeCampaignsSchema = z.object({
  organizationId: z.string().uuid('Invalid organizationId'),
  campaignName: z.string().min(1, 'campaignName is required'),
  campaignType: z.unknown().optional(),
  campaignDescription: z.string().optional(),
  campaignGoals: z.unknown().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  electionDate: z.string().datetime().optional(),
  jurisdictionLevel: z.boolean().optional(),
  jurisdictionName: z.boolean().optional(),
  electoralDistrict: z.boolean().optional(),
  primaryIssue: z.boolean().optional(),
  memberParticipationGoal: z.unknown().optional(),
  doorsKnockedGoal: z.unknown().optional(),
  phoneCallsGoal: z.string().min(10, 'Invalid phone number'),
  budgetAllocated: z.unknown().optional(),
  fundedByCope: z.unknown().optional(),
  copeContributionAmount: z.number().positive('copeContributionAmount must be positive'),
  campaignStatus: z.unknown().optional(),
  membersParticipated: z.unknown().optional(),
  doorsKnocked: z.unknown().optional(),
  phoneCallsMade: z.string().min(10, 'Invalid phone number'),
  expensesToDate: z.string().datetime().optional(),
  outcomeType: z.unknown().optional(),
  outcomeDate: z.string().datetime().optional(),
  outcomeNotes: z.string().optional(),
});

export const POST = async (request: NextRequest) => {
  return withRoleAuth(20, async (request, context) => {
    const user = { id: context.userId, organizationId: context.organizationId };

  try {
      const body = await request.json();
    // Validate request body
    const validation = copeCampaignsSchema.safeParse(body);
    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request data',
        validation.error.errors
      );
    }
    
    const { organizationId, campaignName, campaignType, campaignDescription, campaignGoals, startDate, endDate, electionDate, jurisdictionLevel, jurisdictionName, electoralDistrict, primaryIssue, memberParticipationGoal, doorsKnockedGoal, phoneCallsGoal, budgetAllocated, fundedByCope, copeContributionAmount, campaignStatus, membersParticipated, doorsKnocked, phoneCallsMade, expensesToDate, outcomeType, outcomeDate, outcomeNotes } = validation.data;
      const {
        organizationId,
        campaignName,
        campaignType,
        campaignDescription,
        campaignGoals,
        startDate,
        endDate,
        electionDate,
        jurisdictionLevel,
        jurisdictionName,
        electoralDistrict,
        primaryIssue,
        memberParticipationGoal,
        doorsKnockedGoal,
        phoneCallsGoal,
        budgetAllocated,
        fundedByCope,
        copeContributionAmount,
      } = body;
  if (organizationId && organizationId !== context.organizationId) {
    return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Forbidden'
    );
  }


      // Validate required fields
      if (!organizationId || !campaignName || !campaignType) {
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Bad Request - organizationId, campaignName, and campaignType are required'
      // TODO: Migrate additional details: campaignName, and campaignType are required'
    );
      }

      // Generate campaign code
      const timestamp = Date.now().toString(36).toUpperCase();
      const random = Math.random().toString(36).substring(2, 5).toUpperCase();
      const campaignCode = `COPE-${timestamp}-${random}`;

      // Insert campaign using sql template
      const result = await withRLSContext(async (tx) => {
      return await tx.execute(sql`
      INSERT INTO political_campaigns (
        id,
        organization_id,
        campaign_name,
        campaign_code,
        campaign_type,
        campaign_status,
        campaign_description,
        campaign_goals,
        start_date,
        end_date,
        election_date,
        jurisdiction_level,
        jurisdiction_name,
        electoral_district,
        primary_issue,
        member_participation_goal,
        doors_knocked_goal,
        phone_calls_goal,
        budget_allocated,
        funded_by_cope,
        cope_contribution_amount,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        ${organizationId},
        ${campaignName},
        ${campaignCode},
        ${campaignType},
        'planning',
        ${campaignDescription || null},
        ${campaignGoals || null},
        ${startDate || null},
        ${endDate || null},
        ${electionDate || null},
        ${jurisdictionLevel || null},
        ${jurisdictionName || null},
        ${electoralDistrict || null},
        ${primaryIssue || null},
        ${memberParticipationGoal || null},
        ${doorsKnockedGoal || null},
        ${phoneCallsGoal || null},
        ${budgetAllocated || null},
        ${fundedByCope !== undefined ? fundedByCope : false},
        ${copeContributionAmount || null},
        NOW(),
        NOW()
      )
      RETURNING *
    `);
    });

      return standardSuccessResponse(
      { data: result[0],
        message: 'Political campaign created successfully', },
      undefined,
      201
    );

    } catch (error) {
      logger.error('Failed to create political campaign', error as Error, {
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

export const PATCH = async (request: NextRequest) => {
  return withRoleAuth(20, async (request, context) => {
    const user = { id: context.userId, organizationId: context.organizationId };

  try {
      const { searchParams } = new URL(request.url);
      const campaignId = searchParams.get('id');

      if (!campaignId) {
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Bad Request - id parameter is required'
    );
      }

      const body = await request.json();
      const {
        campaignStatus,
        membersParticipated,
        doorsKnocked,
        phoneCallsMade,
        expensesToDate,
        outcomeType,
        outcomeDate,
        outcomeNotes,
      } = body;

      // Build update SET clauses using sql template
      const updates = [];

      if (campaignStatus !== undefined) {
        updates.push(sql`campaign_status = ${campaignStatus}`);
      }
      if (membersParticipated !== undefined) {
        updates.push(sql`members_participated = ${membersParticipated}`);
      }
      if (doorsKnocked !== undefined) {
        updates.push(sql`doors_knocked = ${doorsKnocked}`);
      }
      if (phoneCallsMade !== undefined) {
        updates.push(sql`phone_calls_made = ${phoneCallsMade}`);
      }
      if (expensesToDate !== undefined) {
        updates.push(sql`expenses_to_date = ${expensesToDate}`);
      }
      if (outcomeType !== undefined) {
        updates.push(sql`outcome_type = ${outcomeType}`);
      }
      if (outcomeDate !== undefined) {
        updates.push(sql`outcome_date = ${outcomeDate}`);
      }
      if (outcomeNotes !== undefined) {
        updates.push(sql`outcome_notes = ${outcomeNotes}`);
      }

      if (updates.length === 0) {
        return NextResponse.json(
          { error: 'Bad Request - No fields to update' },
          { status: 400 }
        );
      }

      updates.push(sql`updated_at = NOW()`);
      const setClause = sql.join(updates, sql.raw(', '));

      const result = await withRLSContext(async (tx) => {
      return await tx.execute(sql`
      UPDATE political_campaigns
      SET ${setClause}
      WHERE id = ${campaignId}
      RETURNING *
    `);
    });

      if (result.length === 0) {
        return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Not Found - Campaign not found'
    );
      }

      return NextResponse.json({
        success: true,
        data: result[0],
        message: 'Political campaign updated successfully',
      });

    } catch (error) {
      logger.error('Failed to update political campaign', error as Error, {
        campaignId: request.nextUrl.searchParams.get('id'),
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

