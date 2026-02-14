import { withRLSContext } from '@/lib/db/with-rls-context';
import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * API Route: Canvassing Activities
 * Track door-knocking, phone banking, and canvassing for political campaigns
 * Phase 3: Political Action & Electoral
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { logger } from '@/lib/logger';
import { z } from "zod";
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';

import { standardSuccessResponse } from '@/lib/api/standardized-responses';
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
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Bad Request - campaignId is required'
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

      const result = await withRLSContext(async (tx) => {
      return await tx.execute(sql`
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
    });

      // Get summary statistics
      const summaryResult = await withRLSContext(async (tx) => {
      return await tx.execute(sql`
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
    });

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
      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Internal Server Error',
      error
    );
    }
    })(request);
};


const copeCanvassingSchema = z.object({
  campaignId: z.string().uuid('Invalid campaignId'),
  organizationId: z.string().uuid('Invalid organizationId'),
  activityType: z.unknown().optional(),
  activityDate: z.string().datetime().optional(),
  volunteerMemberId: z.string().uuid('Invalid volunteerMemberId'),
  volunteerName: z.string().min(1, 'volunteerName is required'),
  contactName: z.string().min(1, 'contactName is required'),
  contactAddress: z.unknown().optional(),
  contactPhone: z.string().min(10, 'Invalid phone number'),
  contactEmail: z.string().email('Invalid email address'),
  responseType: z.unknown().optional(),
  supportLevel: z.unknown().optional(),
  issuesDiscussed: z.boolean().optional(),
  followUpRequired: z.unknown().optional(),
  followUpNotes: z.string().optional(),
  durationMinutes: z.unknown().optional(),
});

export const POST = async (request: NextRequest) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
    const user = { id: context.userId, organizationId: context.organizationId };

  try {
      const body = await request.json();
    // Validate request body
    const validation = copeCanvassingSchema.safeParse(body);
    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request data',
        validation.error.errors
      );
    }
    
      // DUPLICATE REMOVED:     const { campaignId, organizationId, activityType, activityDate, volunteerMemberId, volunteerName, contactName, contactAddress, contactPhone, contactEmail, responseType, supportLevel, issuesDiscussed, followUpRequired, followUpNotes, durationMinutes } = validation.data;
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
    return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Forbidden'
    );
  }


      // Validate required fields
      if (!campaignId || !organizationId || !activityType) {
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Bad Request - campaignId, organizationId, and activityType are required'
    );
      }

      // Insert activity
      const result = await withRLSContext(async (tx) => {
      return await tx.execute(sql`
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
    });

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

      return standardSuccessResponse(
      { data: result[0],
        message: 'Canvassing activity logged successfully', },
      undefined,
      201
    );

    } catch (error) {
      logger.error('Failed to log canvassing activity', error as Error, {
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

