import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * API Route: Canvassing Activities
 * Track door-knocking, phone banking, and canvassing for political campaigns
 * Phase 3: Political Action & Electoral
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { sql } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { z } from "zod";
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';

export const dynamic = 'force-dynamic';

export const GET = async (request: NextRequest) => {
  return withEnhancedRoleAuth(10, async (request, context) => {
    const user = { id: context.userId, organizationId: context.organizationId };

  try {
      const { searchParams } = new URL(request.url);
      const campaignId = searchParams.get('campaignId');
      const activityType = searchParams.get('activityType'); // door_knock, phone_call, petition_signature
      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');

      if (!campaignId) {
        return NextResponse.json(
          { error: 'Bad Request - campaignId is required' },
          { status: 400 }
        );
      }

      // Build query
      const conditions = [sql`campaign_id = ${campaignId}`];

      if (activityType) {
        conditions.push(sql`activity_type = ${activityType}`);
      }

      if (startDate) {
        conditions.push(sql`activity_date >= ${startDate}`);
      }

      if (endDate) {
        conditions.push(sql`activity_date <= ${endDate}`);
      }

      const whereClause = sql.join(conditions, sql.raw(' AND '));

      const result = await db.execute(sql`
      SELECT 
        id,
        campaign_id,
        activity_type,
        activity_date,
        volunteer_member_id,
        volunteer_name,
        contact_name,
        contact_address,
        contact_phone,
        contact_email,
        response_type,
        support_level,
        issues_discussed,
        follow_up_required,
        follow_up_notes,
        duration_minutes,
        created_at
      FROM canvassing_activities
      WHERE ${whereClause}
      ORDER BY activity_date DESC, created_at DESC
      LIMIT 1000
    `);

      // Get summary statistics
      const summaryResult = await db.execute(sql`
      SELECT 
        activity_type,
        COUNT(*) as total_activities,
        COUNT(DISTINCT volunteer_member_id) as unique_volunteers,
        SUM(duration_minutes) as total_minutes,
        SUM(CASE WHEN response_type = 'answered' THEN 1 ELSE 0 END) as answered,
        SUM(CASE WHEN response_type = 'no_answer' THEN 1 ELSE 0 END) as no_answer,
        SUM(CASE WHEN support_level = 'strong_supporter' THEN 1 ELSE 0 END) as strong_supporters,
        SUM(CASE WHEN support_level = 'supporter' THEN 1 ELSE 0 END) as supporters,
        SUM(CASE WHEN support_level = 'undecided' THEN 1 ELSE 0 END) as undecided,
        SUM(CASE WHEN support_level = 'opposed' THEN 1 ELSE 0 END) as opposed
      FROM canvassing_activities
      WHERE campaign_id = ${campaignId}
      GROUP BY activity_type
    `);

      return NextResponse.json({
        success: true,
        data: {
          activities: result,
          summary: summaryResult,
        },
        count: result.length,
      });

    } catch (error) {
      logger.error('Failed to fetch canvassing activities', error as Error, {
        campaignId: request.nextUrl.searchParams.get('campaignId'),
        correlationId: request.headers.get('x-correlation-id'),
      });
      return NextResponse.json(
        { error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
    })(request);
};

export const POST = async (request: NextRequest) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
    const user = { id: context.userId, organizationId: context.organizationId };

  try {
      const body = await request.json();
      const {
        campaignId,
        organizationId,
        activityType,
        activityDate,
        volunteerMemberId,
        volunteerName,
        contactName,
        contactAddress,
        contactPhone,
        contactEmail,
        responseType,
        supportLevel,
        issuesDiscussed,
        followUpRequired,
        followUpNotes,
        durationMinutes,
      } = body;
  if (organizationId && organizationId !== context.organizationId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }


      // Validate required fields
      if (!campaignId || !organizationId || !activityType) {
        return NextResponse.json(
          { error: 'Bad Request - campaignId, organizationId, and activityType are required' },
          { status: 400 }
        );
      }

      // Insert activity
      const result = await db.execute(sql`
      INSERT INTO canvassing_activities (
        id,
        campaign_id,
        organization_id,
        activity_type,
        activity_date,
        volunteer_member_id,
        volunteer_name,
        contact_name,
        contact_address,
        contact_phone,
        contact_email,
        response_type,
        support_level,
        issues_discussed,
        follow_up_required,
        follow_up_notes,
        duration_minutes,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        ${campaignId}, ${organizationId}, ${activityType},
        ${activityDate || new Date().toISOString().split('T')[0]},
        ${volunteerMemberId || null}, ${volunteerName || null},
        ${contactName || null}, ${contactAddress || null},
        ${contactPhone || null}, ${contactEmail || null},
        ${responseType || null}, ${supportLevel || null},
        ${issuesDiscussed ? JSON.stringify(issuesDiscussed) : null},
        ${followUpRequired !== undefined ? followUpRequired : false},
        ${followUpNotes || null}, ${durationMinutes || null},
        NOW(), NOW()
      )
      RETURNING 
        id, activity_type, activity_date, volunteer_name, contact_name, 
        response_type, support_level, duration_minutes
    `);

      // Update campaign progress counters
      if (activityType === 'door_knock') {
        await db.execute(sql`
        UPDATE political_campaigns
        SET doors_knocked = doors_knocked + 1, updated_at = NOW()
        WHERE id = ${campaignId}
      `);
      } else if (activityType === 'phone_call') {
        await db.execute(sql`
        UPDATE political_campaigns
        SET phone_calls_made = phone_calls_made + 1, updated_at = NOW()
        WHERE id = ${campaignId}
      `);
      } else if (activityType === 'petition_signature') {
        await db.execute(sql`
        UPDATE political_campaigns
        SET petition_signatures_collected = petition_signatures_collected + 1, updated_at = NOW()
        WHERE id = ${campaignId}
      `);
      }

      return NextResponse.json({
        success: true,
        data: result[0],
        message: 'Canvassing activity logged successfully',
      }, { status: 201 });

    } catch (error) {
      logger.error('Failed to log canvassing activity', error as Error, {
        correlationId: request.headers.get('x-correlation-id'),
      });
      return NextResponse.json(
        { error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
    })(request);
};
