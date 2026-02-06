/**
 * API Route: Pension Plans
 * Manage pension plans for organizations
 * Phase 1: Pension & Health/Welfare
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db/db';
import { pensionPlans } from '@/db/migrations/schema';
import { eq, and, desc } from 'drizzle-orm';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/pension/plans
 * List pension plans for the organization
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

    // Fetch pension plans for the organization
    const plans = await db
      .select()
      .from(pensionPlans)
      .where(eq(pensionPlans.organizationId, organizationId))
      .orderBy(desc(pensionPlans.createdAt));

    return NextResponse.json({
      success: true,
      data: plans,
      count: plans.length,
    });

  } catch (error) {
    logger.error('Failed to fetch pension plans', error as Error, {      organizationId: request.nextUrl.searchParams.get('organizationId'),
      correlationId: request.headers.get('x-correlation-id'),
    });
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/pension/plans
 * Create a new pension plan
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
      planNumber,
      contributionRate,
      normalRetirementAge,
      vestingPeriodYears,
      trustAgreementUrl,
      planStatus,
      planEffectiveDate,
      planYearEnd,
    } = body;

    // Validate required fields
    if (!organizationId || !planName || !planType || !planEffectiveDate || !planYearEnd) {
      return NextResponse.json(
        { error: 'Bad Request - organizationId, planName, planType, planEffectiveDate, and planYearEnd are required' },
        { status: 400 }
      );
    }

    // Create pension plan
    const [newPlan] = await db
      .insert(pensionPlans)
      .values({
        organizationId,
        planName,
        planType,
        planNumber,
        contributionRate: contributionRate ? String(contributionRate) : null,
        normalRetirementAge: normalRetirementAge || 65,
        vestingPeriodYears: vestingPeriodYears || 2,
        planStatus: planStatus || 'active',
        planEffectiveDate,
        planYearEnd,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: newPlan,
      message: 'Pension plan created successfully',
    }, { status: 201 });

  } catch (error) {
    logger.error('Failed to create pension plan', error as Error, {      correlationId: request.headers.get('x-correlation-id'),
    });
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
