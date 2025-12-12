/**
 * API Route: COPE Political Campaigns
 * Manage political action campaigns (electoral, legislative, GOTV)
 * Phase 3: Political Action & Electoral
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db/db';
import { sql } from 'drizzle-orm';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cope/campaigns
 * List political campaigns for an organization
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const campaignType = searchParams.get('campaignType');
    const campaignStatus = searchParams.get('campaignStatus');

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Bad Request - organizationId is required' },
        { status: 400 }
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

    const result = await db.execute(sql`
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
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cope/campaigns
 * Create a new political campaign
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
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

    // Validate required fields
    if (!organizationId || !campaignName || !campaignType) {
      return NextResponse.json(
        { error: 'Bad Request - organizationId, campaignName, and campaignType are required' },
        { status: 400 }
      );
    }

    // Generate campaign code
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    const campaignCode = `COPE-${timestamp}-${random}`;

    // Insert campaign using sql template
    const result = await db.execute(sql`
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

    return NextResponse.json({
      success: true,
      data: result[0],
      message: 'Political campaign created successfully',
    }, { status: 201 });

  } catch (error) {
    logger.error('Failed to create political campaign', error as Error, {
      correlationId: request.headers.get('x-correlation-id'),
    });
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/cope/campaigns?id=<campaignId>
 * Update a political campaign (status, progress metrics, outcome)
 */
export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('id');

    if (!campaignId) {
      return NextResponse.json(
        { error: 'Bad Request - id parameter is required' },
        { status: 400 }
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

    const result = await db.execute(sql`
      UPDATE political_campaigns
      SET ${setClause}
      WHERE id = ${campaignId}
      RETURNING *
    `);

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Not Found - Campaign not found' },
        { status: 404 }
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
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
