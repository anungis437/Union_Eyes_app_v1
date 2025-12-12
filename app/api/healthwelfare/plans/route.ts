/**
 * API Route: Health & Welfare Plans
 * Manage H&W benefit plans and member eligibility
 * Phase 2: Pension & H&W Trust Administration
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db/db';
import { sql } from 'drizzle-orm';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/healthwelfare/plans
 * List H&W plans for an organization
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

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Bad Request - organizationId is required' },
        { status: 400 }
      );
    }

    const result = await db.execute(sql`
      SELECT 
        id,
        organization_id,
        plan_name,
        plan_number,
        plan_type,
        plan_status,
        coverage_start_date,
        coverage_end_date,
        insurance_carrier,
        policy_number,
        monthly_premium_single,
        monthly_premium_family,
        annual_deductible_single,
        annual_deductible_family,
        out_of_pocket_max_single,
        out_of_pocket_max_family,
        prescription_coverage,
        dental_coverage,
        vision_coverage,
        created_at,
        updated_at
      FROM hw_plans
      WHERE organization_id = ${organizationId}
      ORDER BY plan_name ASC
    `);

    return NextResponse.json({
      success: true,
      data: result,
      count: result.length,
    });

  } catch (error) {
    logger.error('Failed to fetch H&W plans', error as Error, {
      correlationId: request.headers.get('x-correlation-id'),
    });
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/healthwelfare/plans
 * Create a new H&W plan
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
      planName,
      planType,
      insuranceCarrier,
      coverageStartDate,
      monthlyPremiumSingle,
      monthlyPremiumFamily,
    } = body;

    if (!organizationId || !planName || !planType || !coverageStartDate) {
      return NextResponse.json(
        { error: 'Bad Request - organizationId, planName, planType, and coverageStartDate are required' },
        { status: 400 }
      );
    }

    const result = await db.execute(sql`
      INSERT INTO hw_plans (
        id,
        organization_id,
        plan_name,
        plan_type,
        plan_status,
        insurance_carrier,
        coverage_start_date,
        monthly_premium_single,
        monthly_premium_family,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        ${organizationId}, ${planName}, ${planType}, 'active',
        ${insuranceCarrier}, ${coverageStartDate},
        ${monthlyPremiumSingle}, ${monthlyPremiumFamily},
        NOW(), NOW()
      )
      RETURNING *
    `);

    return NextResponse.json({
      success: true,
      data: result[0],
      message: 'H&W plan created successfully',
    }, { status: 201 });

  } catch (error) {
    logger.error('Failed to create H&W plan', error as Error, {
      correlationId: request.headers.get('x-correlation-id'),
    });
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
