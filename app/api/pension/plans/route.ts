import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * API Route: Pension Plans
 * Manage pension plans for organizations
 * Phase 1: Pension & Health/Welfare
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { pensionPlans } from '@/db/migrations/schema';
import { eq, and, desc } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { z } from "zod";
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";

export const dynamic = 'force-dynamic';

export const GET = async (request: NextRequest) => {
  return withEnhancedRoleAuth(10, async (request, context) => {
    const user = { id: context.userId, organizationId: context.organizationId };

  try {
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
    })(request);
};

export const POST = async (request: NextRequest) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
    const user = { id: context.userId, organizationId: context.organizationId };

  try {
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
  if (organizationId && organizationId !== context.organizationId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }


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
    })(request);
};
