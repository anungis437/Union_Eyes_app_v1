import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * API Route: Workplace Mapping
 * Map workplace contacts and support levels for organizing campaigns
 * Phase 3: Organizing & Certification
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { logger } from '@/lib/logger';
import { z } from "zod";
import { withApiAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { safeColumnName } from '@/lib/safe-sql-identifiers';

import { standardSuccessResponse } from '@/lib/api/standardized-responses';
interface AuthContext {
  userId: string;
  organizationId: string;
  params?: Record<string, unknown>;
}

export const dynamic = 'force-dynamic';

export const GET = withRoleAuth('member', async (request: NextRequest, context: AuthContext) => {
  try {
      const { searchParams } = new URL(request.url);
      const campaignId = searchParams.get('campaignId');
      const viewType = searchParams.get('viewType') || 'department'; // department, shift, support_level

      if (!campaignId) {
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Bad Request - campaignId is required'
    );
      }

      // SECURITY: Validate viewType against allowlist
      const ALLOWED_VIEW_TYPES: Record<string, string> = {
        'department': 'department',
        'shift': 'shift',
        'support_level': 'support_level'
      };

      const groupByField = ALLOWED_VIEW_TYPES[viewType] || 'department';
      const safeGroupBy = safeColumnName(groupByField);

      // SECURITY: Use parameterized query with safe identifiers
      const result = await db.execute(sql`
        SELECT 
          ${safeGroupBy} as group_name,
          COUNT(*) as total_contacts,
          SUM(CASE WHEN card_signed = true THEN 1 ELSE 0 END) as cards_signed,
          SUM(CASE WHEN organizing_committee_member = true THEN 1 ELSE 0 END) as committee_members,
          SUM(CASE WHEN support_level = 'strong_supporter' THEN 1 ELSE 0 END) as strong_supporters,
          SUM(CASE WHEN support_level = 'supporter' THEN 1 ELSE 0 END) as supporters,
          SUM(CASE WHEN support_level = 'undecided' THEN 1 ELSE 0 END) as undecided,
          SUM(CASE WHEN support_level = 'soft_opposition' THEN 1 ELSE 0 END) as soft_opposition,
          SUM(CASE WHEN support_level = 'strong_opposition' THEN 1 ELSE 0 END) as strong_opposition,
          SUM(CASE WHEN support_level = 'unknown' THEN 1 ELSE 0 END) as unknown,
          ROUND(
            (SUM(CASE WHEN card_signed = true THEN 1 ELSE 0 END)::DECIMAL / 
            NULLIF(COUNT(*), 0)) * 100, 2
          ) as card_signed_percentage
        FROM organizing_contacts
        WHERE campaign_id = ${campaignId}
        GROUP BY ${safeGroupBy}
        ORDER BY ${safeGroupBy}
      `);

      // Get campaign overall stats
      const statsResult = await db.execute(sql`
      SELECT 
        COUNT(*) as total_contacts,
        SUM(CASE WHEN card_signed = true THEN 1 ELSE 0 END) as total_cards_signed,
        SUM(CASE WHEN organizing_committee_member = true THEN 1 ELSE 0 END) as total_committee_members,
        oc.estimated_eligible_workers,
        oc.card_signing_goal,
        oc.card_signing_threshold_percentage,
        oc.super_majority_goal,
        oc.super_majority_threshold_percentage
      FROM organizing_contacts ocon
      JOIN organizing_campaigns oc ON ocon.campaign_id = oc.id
      WHERE ocon.campaign_id = ${campaignId}
      GROUP BY oc.id
    `);

      return NextResponse.json({
        success: true,
        data: {
          groupBy: viewType,
          groups: result,
          summary: statsResult[0] || {},
        },
      });

    } catch (error) {
      logger.error('Failed to fetch workplace mapping data', error as Error, {
        campaignId: request.nextUrl.searchParams.get('campaignId'),
        correlationId: request.headers.get('x-correlation-id'),
      });
      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Internal Server Error',
      error
    );
    }
});


const organizingWorkplaceMappingSchema = z.object({
  campaignId: z.string().uuid('Invalid campaignId'),
  organizationId: z.string().uuid('Invalid organizationId'),
  jobTitle: z.string().min(1, 'jobTitle is required'),
  department: z.unknown().optional(),
  shift: z.unknown().optional(),
  supportLevel: z.unknown().optional(),
  cardSigned: z.unknown().optional(),
  cardSignedDate: z.string().datetime().optional(),
  organizingCommitteeMember: z.unknown().optional(),
  primaryIssues: z.boolean().optional(),
  notes: z.string().optional(),
});

export const POST = withRoleAuth('steward', async (request: NextRequest, context: AuthContext) => {
  try {
      const body = await request.json();
    // Validate request body
    const validation = organizingWorkplace-mappingSchema.safeParse(body);
    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request data',
        validation.error.errors
      );
    }
    
    const { campaignId, organizationId, jobTitle, department, shift, supportLevel, cardSigned, cardSignedDate, organizingCommitteeMember, primaryIssues, notes } = validation.data;
    // DUPLICATE REMOVED (Phase 2): Multi-line destructuring of body
    // const {
    // campaignId,
    // organizationId,
    // jobTitle,
    // department,
    // shift,
    // supportLevel,
    // cardSigned,
    // cardSignedDate,
    // organizingCommitteeMember,
    // primaryIssues,
    // notes,
    // } = body;
  if (organizationId && organizationId !== context.organizationId) {
    return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Forbidden'
    );
  }


      // Validate required fields
      if (!campaignId || !organizationId) {
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Bad Request - campaignId and organizationId are required'
    );
      }

      // Generate anonymous contact number
      const contactCount = await db.execute(sql`
      SELECT COUNT(*) as count 
      FROM organizing_contacts 
      WHERE campaign_id = ${campaignId}
    `);
      const nextNumber = (parseInt(String(contactCount[0]?.count || '0')) + 1).toString().padStart(4, '0');
      const campaignCode = await db.execute(sql`
      SELECT campaign_code 
      FROM organizing_campaigns 
      WHERE id = ${campaignId}
    `);
      const contactNumber = `${campaignCode[0]?.campaign_code || 'CONTACT'}-${nextNumber}`;

      // Insert contact
      const result = await db.execute(sql`
      INSERT INTO organizing_contacts (
        id,
        campaign_id,
        organization_id,
        contact_number,
        job_title,
        department,
        shift,
        support_level,
        card_signed,
        card_signed_date,
        organizing_committee_member,
        primary_issues,
        notes,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        ${campaignId}, ${organizationId}, ${contactNumber},
        ${jobTitle || null}, ${department || null}, ${shift || null},
        ${supportLevel || 'unknown'}, ${cardSigned || false},
        ${cardSignedDate || null}, ${organizingCommitteeMember || false},
        ${primaryIssues ? JSON.stringify(primaryIssues) : null},
        ${notes || null},
        NOW(), NOW()
      )
      RETURNING id, contact_number, job_title, department, shift, support_level, card_signed, organizing_committee_member
    `);

      return standardSuccessResponse(
      { data: result[0],
        message: 'Workplace contact added successfully', },
      undefined,
      201
    );

    } catch (error) {
      logger.error('Failed to add workplace contact', error as Error, {
        correlationId: request.headers.get('x-correlation-id'),
      });
      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Internal Server Error',
      error
    );
    }
});

