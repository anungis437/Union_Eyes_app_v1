import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * API Route: Organizing Committee
 * Manage organizing committee members and activities
 * Phase 3: Organizing & Certification
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { sql } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { z } from "zod";
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";

export const dynamic = 'force-dynamic';

export const GET = async (request: NextRequest) => {
  return withEnhancedRoleAuth(10, async (request, context) => {
    const user = { id: context.userId, organizationId: context.organizationId };

  try {
      const { searchParams } = new URL(request.url);
      const campaignId = searchParams.get('campaignId');

      if (!campaignId) {
        return NextResponse.json(
          { error: 'Bad Request - campaignId is required' },
          { status: 400 }
        );
      }

      // Fetch committee members
      const result = await db.execute(sql`
      SELECT 
        id,
        contact_number,
        job_title,
        department,
        shift,
        organizing_committee_role,
        support_level,
        card_signed,
        card_signed_date,
        natural_leader,
        last_contact_date,
        last_contact_method,
        primary_issues,
        created_at
      FROM organizing_contacts
      WHERE campaign_id = ${campaignId}
        AND organizing_committee_member = true
      ORDER BY 
        CASE organizing_committee_role
          WHEN 'workplace lead' THEN 1
          WHEN 'shift captain' THEN 2
          WHEN 'department rep' THEN 3
          ELSE 4
        END,
        department, shift
    `);

      // Get committee summary
      const summaryResult = await db.execute(sql`
      SELECT 
        COUNT(*) as total_committee_members,
        SUM(CASE WHEN card_signed = true THEN 1 ELSE 0 END) as members_with_cards,
        COUNT(DISTINCT department) as departments_represented,
        COUNT(DISTINCT shift) as shifts_represented,
        SUM(CASE WHEN organizing_committee_role = 'workplace lead' THEN 1 ELSE 0 END) as workplace_leads,
        SUM(CASE WHEN organizing_committee_role = 'shift captain' THEN 1 ELSE 0 END) as shift_captains,
        SUM(CASE WHEN organizing_committee_role = 'department rep' THEN 1 ELSE 0 END) as department_reps
      FROM organizing_contacts
      WHERE campaign_id = ${campaignId}
        AND organizing_committee_member = true
    `);

      return NextResponse.json({
        success: true,
        data: {
          members: result,
          summary: summaryResult[0] || {},
        },
        count: result.length,
      });

    } catch (error) {
      logger.error('Failed to fetch organizing committee', error as Error, {
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
        contactId,
        organizingCommitteeRole,
        naturalLeader,
      } = body;

      // Validate required fields
      if (!contactId) {
        return NextResponse.json(
          { error: 'Bad Request - contactId is required' },
          { status: 400 }
        );
      }

      // Update contact to add to committee
      const result = await db.execute(sql`
      UPDATE organizing_contacts
      SET 
        organizing_committee_member = true,
        organizing_committee_role = ${organizingCommitteeRole || 'member'},
        natural_leader = ${naturalLeader !== undefined ? naturalLeader : false},
        updated_at = NOW()
      WHERE id = ${contactId}
      RETURNING 
        id, contact_number, job_title, department, shift,
        organizing_committee_role, natural_leader, support_level
    `);

      if (result.length === 0) {
        return NextResponse.json(
          { error: 'Not Found - Contact not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: result[0],
        message: 'Contact added to organizing committee',
      });

    } catch (error) {
      logger.error('Failed to add contact to committee', error as Error, {
        correlationId: request.headers.get('x-correlation-id'),
      });
      return NextResponse.json(
        { error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
    })(request);
};

export const DELETE = async (request: NextRequest) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
    const user = { id: context.userId, organizationId: context.organizationId };

  try {
      const { searchParams } = new URL(request.url);
      const contactId = searchParams.get('contactId');

      if (!contactId) {
        return NextResponse.json(
          { error: 'Bad Request - contactId parameter is required' },
          { status: 400 }
        );
      }

      // Update contact to remove from committee
      const result = await db.execute(sql`
      UPDATE organizing_contacts
      SET 
        organizing_committee_member = false,
        organizing_committee_role = NULL,
        updated_at = NOW()
      WHERE id = ${contactId}
      RETURNING id, contact_number
    `);

      if (result.length === 0) {
        return NextResponse.json(
          { error: 'Not Found - Contact not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: result[0],
        message: 'Contact removed from organizing committee',
      });

    } catch (error) {
      logger.error('Failed to remove contact from committee', error as Error, {
        contactId: request.nextUrl.searchParams.get('contactId'),
        correlationId: request.headers.get('x-correlation-id'),
      });
      return NextResponse.json(
        { error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
    })(request);
};
