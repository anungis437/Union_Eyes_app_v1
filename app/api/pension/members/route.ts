import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * API Route: Pension Plan Members
 * Manage member enrollments and hours banks
 * Phase 2: Pension & H&W Trust Administration
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
      const planId = searchParams.get('planId');
      const memberId = searchParams.get('memberId');

      if (!planId) {
        return NextResponse.json(
          { error: 'Bad Request - planId is required' },
          { status: 400 }
        );
      }

      const conditions = [sql`ppm.pension_plan_id = ${planId}`];
      if (memberId) {
        conditions.push(sql`ppm.member_id = ${memberId}`);
      }

      const result = await db.execute(sql`
      SELECT 
        ppm.id,
        ppm.pension_plan_id,
        ppm.member_id,
        m.first_name,
        m.last_name,
        m.email,
        ppm.enrollment_date,
        ppm.enrollment_status,
        ppm.service_credit_years,
        ppm.accumulated_contributions,
        ppm.estimated_monthly_benefit,
        ppm.beneficiary_name,
        ppm.beneficiary_relationship,
        ppm.created_at
      FROM pension_plan_members ppm
      JOIN members m ON m.id = ppm.member_id
      WHERE ${sql.join(conditions, sql.raw(' AND '))}
      ORDER BY m.last_name, m.first_name
    `);

      return NextResponse.json({
        success: true,
        data: result,
        count: result.length,
      });

    } catch (error) {
      logger.error('Failed to fetch pension plan members', error as Error, {
        correlationId: request.headers.get('x-correlation-id'),
      });
      return NextResponse.json(
        { error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  })
  })(request);
};

export const POST = async (request: NextRequest) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
    const user = { id: context.userId, organizationId: context.organizationId };

  try {
      const body = await request.json();
      const {
        pensionPlanId,
        memberId,
        enrollmentDate,
        beneficiaryName,
        beneficiaryRelationship,
      } = body;

      if (!pensionPlanId || !memberId || !enrollmentDate) {
        return NextResponse.json(
          { error: 'Bad Request - pensionPlanId, memberId, and enrollmentDate are required' },
          { status: 400 }
        );
      }

      const result = await db.execute(sql`
      INSERT INTO pension_plan_members (
        id,
        pension_plan_id,
        member_id,
        enrollment_date,
        enrollment_status,
        service_credit_years,
        accumulated_contributions,
        beneficiary_name,
        beneficiary_relationship,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        ${pensionPlanId}, ${memberId}, ${enrollmentDate},
        'active', 0, 0,
        ${beneficiaryName}, ${beneficiaryRelationship},
        NOW(), NOW()
      )
      RETURNING *
    `);

      return NextResponse.json({
        success: true,
        data: result[0],
        message: 'Member enrolled in pension plan successfully',
      }, { status: 201 });

    } catch (error) {
      logger.error('Failed to enroll member in pension plan', error as Error, {
        correlationId: request.headers.get('x-correlation-id'),
      });
      return NextResponse.json(
        { error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  })
  })(request);
};
