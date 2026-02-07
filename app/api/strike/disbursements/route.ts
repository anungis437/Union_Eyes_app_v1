/**
 * API Route: Strike Stipend Disbursements
 * Manage weekly stipend calculations and payments
 * Phase 3: Strike Administration
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db/db';
import { sql } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { withEnhancedRoleAuth } from '@/lib/enterprise-role-middleware';
import { logApiAuditEvent } from '@/lib/middleware/request-validation';

export const dynamic = 'force-dynamic';

// Validation schema for GET query parameters
const listDisbursementsSchema = z.object({
  fundId: z.string().uuid('Invalid fund ID format'),
  limit: z.string().default('50').transform(v => Math.min(parseInt(v), 500)),
});

// Validation schema for POST body
const calculateStipendsSchema = z.object({
  fundId: z.string().uuid('Invalid fund ID format'),
  weekStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Week start date must be in YYYY-MM-DD format'),
  weekEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Week end date must be in YYYY-MM-DD format'),
});

/**
 * GET /api/strike/disbursements
 * List stipend disbursements for a strike fund
 */
export const GET = withEnhancedRoleAuth(60, async (request, context) => {
  try {
    const queryResult = listDisbursementsSchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams)
    );

    if (!queryResult.success) {
      return NextResponse.json(
        { error: 'Invalid request parameters' },
        { status: 400 }
      );
    }

    const { fundId, limit } = queryResult.data;

      const result = await db.execute(sql`
        SELECT 
          sd.id,
          sd.strike_fund_id,
          sd.member_id,
          m.first_name || ' ' || m.last_name as member_name,
          sd.week_start_date,
          sd.week_end_date,
          sd.hours_worked,
          sd.stipend_amount,
          sd.payment_status,
          sd.payment_date,
          sd.payment_method,
          sd.stripe_payment_intent_id,
          sd.notes,
          sd.created_at
        FROM stipend_disbursements sd
        JOIN members m ON m.id = sd.member_id
        WHERE sd.strike_fund_id = ${fundId}
        ORDER BY sd.week_start_date DESC, m.last_name, m.first_name
        LIMIT ${limit}
      `);

      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId: context.userId,
        endpoint: '/api/strike/disbursements',
        method: 'GET',
        eventType: 'success',
        severity: 'high',
        details: {
          dataType: 'FINANCIAL',
          fundId,
          disbursementsCount: result.length,
        },
      });

      return NextResponse.json({
        success: true,
        data: result,
        count: result.length,
      });

  } catch (error) {
    logger.error('Failed to fetch disbursements', error as Error, {
      userId: context.userId,
      correlationId: request.headers.get('x-correlation-id'),
    });

    logApiAuditEvent({
      timestamp: new Date().toISOString(),
      userId: context.userId,
      endpoint: '/api/strike/disbursements',
      method: 'GET',
      eventType: 'error',
      severity: 'high',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

/**
 * POST /api/strike/disbursements/calculate
 * Calculate stipends for eligible members for a specific week
 */
export const POST = withEnhancedRoleAuth(90, async (request, context) => {
  try {
    const body = await request.json();
    const parsed = calculateStipendsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const { fundId, weekStartDate, weekEndDate } = parsed.data;

      // Use the calculate_stipend_amount function for each eligible member
      const result = await db.execute(sql`
        WITH eligible_members AS (
          SELECT DISTINCT fe.member_id
          FROM fund_eligibility fe
          WHERE fe.strike_fund_id = ${fundId}
            AND fe.eligibility_status = 'eligible'
            AND fe.eligibility_start_date <= ${weekStartDate}
            AND (fe.eligibility_end_date IS NULL OR fe.eligibility_end_date >= ${weekEndDate})
        ),
        stipend_calculations AS (
          SELECT 
            em.member_id,
            m.first_name || ' ' || m.last_name as member_name,
            COALESCE(
              (SELECT SUM(hours_worked) 
               FROM picket_attendance pa
               WHERE pa.member_id = em.member_id
                 AND pa.check_in_time >= ${weekStartDate}
                 AND pa.check_in_time < ${weekEndDate}
                 AND pa.verification_status = 'verified'),
              0
            ) as total_hours,
            calculate_stipend_amount(${fundId}, em.member_id, ${weekStartDate}, ${weekEndDate}) as stipend_amount
          FROM eligible_members em
          JOIN members m ON m.id = em.member_id
        )
        SELECT 
          sc.member_id,
          sc.member_name,
          sc.total_hours as hours_worked,
          sc.stipend_amount,
          CASE 
            WHEN sc.stipend_amount > 0 THEN 'approved'
            ELSE 'pending_review'
          END as payment_status
        FROM stipend_calculations sc
        WHERE sc.total_hours > 0
        ORDER BY sc.member_name
      `);

      // Insert the calculated disbursements
      if (result.length > 0) {
        const insertValues = result.map((row: any) => sql`(
          gen_random_uuid(), ${fundId}, ${row.member_id},
          ${weekStartDate}, ${weekEndDate},
          ${row.hours_worked}, ${row.stipend_amount}, ${row.payment_status},
          NOW(), NOW()
        )`);

        await db.execute(sql`
          INSERT INTO stipend_disbursements (
            id, strike_fund_id, member_id, week_start_date, week_end_date,
            hours_worked, stipend_amount, payment_status, created_at, updated_at
          ) VALUES ${sql.join(insertValues, sql.raw(', '))}
          ON CONFLICT (strike_fund_id, member_id, week_start_date) DO NOTHING
          RETURNING id
        `);
      }

      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId: context.userId,
        endpoint: '/api/strike/disbursements',
        method: 'POST',
        eventType: 'success',
        severity: 'high',
        details: {
          dataType: 'FINANCIAL',
          fundId,
          weekStartDate,
          weekEndDate,
          membersProcessed: result.length,
        },
      });

      return NextResponse.json({
        success: true,
        data: result,
        count: result.length,
        message: `Calculated stipends for ${result.length} members`,
      }, { status: 201 });

  } catch (error) {
    logger.error('Failed to calculate stipends', error as Error, {
      userId: context.userId,
      correlationId: request.headers.get('x-correlation-id'),
    });

    logApiAuditEvent({
      timestamp: new Date().toISOString(),
      userId: context.userId,
      endpoint: '/api/strike/disbursements',
      method: 'POST',
      eventType: 'error',
      severity: 'high',
      details: { 
        dataType: 'FINANCIAL',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
