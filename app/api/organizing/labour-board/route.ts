/**
 * API Route: Labour Board Filings
 * Manage certification applications and labour board filings
 * Phase 3: Organizing & Certification
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db/db';
import { sql } from 'drizzle-orm';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/organizing/labour-board
 * List labour board filings for an organization or campaign
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
    const campaignId = searchParams.get('campaignId');

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Bad Request - organizationId is required' },
        { status: 400 }
      );
    }

    // Build query
    const conditions = [sql`lbf.organization_id = ${organizationId}`];

    if (campaignId) {
      conditions.push(sql`lbf.campaign_id = ${campaignId}`);
    }

    const whereClause = sql.join(conditions, sql.raw(' AND '));

    const result = await db.execute(sql`
      SELECT 
        lbf.id,
        lbf.campaign_id,
        lbf.filing_number,
        lbf.filing_type,
        lbf.filing_status,
        lbf.labor_board_name,
        lbf.filed_date,
        lbf.hearing_date,
        lbf.decision_date,
        lbf.decision_outcome,
        lbf.certification_number,
        lbf.bargaining_unit_description,
        lbf.estimated_unit_size,
        lbf.supporting_documentation,
        lbf.created_at,
        oc.campaign_name,
        oc.target_employer_name
      FROM labour_board_filings lbf
      LEFT JOIN organizing_campaigns oc ON lbf.campaign_id = oc.id
      WHERE ${whereClause}
      ORDER BY lbf.filed_date DESC NULLS LAST, lbf.created_at DESC
    `);

    return NextResponse.json({
      success: true,
      data: result,
      count: result.length,
    });

  } catch (error) {
    logger.error('Failed to fetch labour board filings', error as Error, {
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
 * POST /api/organizing/labour-board
 * Create a new labour board filing
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
      campaignId,
      filingType,
      laborBoardName,
      filedDate,
      bargainingUnitDescription,
      estimatedUnitSize,
      supportingDocumentation,
    } = body;

    // Validate required fields
    if (!organizationId || !campaignId || !filingType || !laborBoardName) {
      return NextResponse.json(
        { error: 'Bad Request - organizationId, campaignId, filingType, and laborBoardName are required' },
        { status: 400 }
      );
    }

    // Generate filing number
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const filingNumber = `LBF-${timestamp}-${random}`;

    // Insert filing
    const result = await db.execute(sql`
      INSERT INTO labour_board_filings (
        id,
        organization_id,
        campaign_id,
        filing_number,
        filing_type,
        filing_status,
        labor_board_name,
        filed_date,
        bargaining_unit_description,
        estimated_unit_size,
        supporting_documentation,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        ${organizationId}, ${campaignId}, ${filingNumber},
        ${filingType}, ${'draft'}, ${laborBoardName},
        ${filedDate || null}, ${bargainingUnitDescription || null},
        ${estimatedUnitSize || null},
        ${supportingDocumentation ? JSON.stringify(supportingDocumentation) : null},
        NOW(), NOW()
      )
      RETURNING *
    `);

    return NextResponse.json({
      success: true,
      data: result[0],
      message: 'Labour board filing created successfully',
    }, { status: 201 });

  } catch (error) {
    logger.error('Failed to create labour board filing', error as Error, {
      correlationId: request.headers.get('x-correlation-id'),
    });
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/organizing/labour-board?id=<filingId>
 * Update a labour board filing (status, hearing date, decision)
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
    const filingId = searchParams.get('id');

    if (!filingId) {
      return NextResponse.json(
        { error: 'Bad Request - id parameter is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      filingStatus,
      hearingDate,
      decisionDate,
      decisionOutcome,
      certificationNumber,
    } = body;

    // Build update query
    const updates: any[] = [];

    if (filingStatus !== undefined) {
      updates.push(sql`filing_status = ${filingStatus}`);
    }
    if (hearingDate !== undefined) {
      updates.push(sql`hearing_date = ${hearingDate}`);
    }
    if (decisionDate !== undefined) {
      updates.push(sql`decision_date = ${decisionDate}`);
    }
    if (decisionOutcome !== undefined) {
      updates.push(sql`decision_outcome = ${decisionOutcome}`);
    }
    if (certificationNumber !== undefined) {
      updates.push(sql`certification_number = ${certificationNumber}`);
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
      UPDATE labour_board_filings
      SET ${setClause}
      WHERE id = ${filingId}
      RETURNING *
    `);

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Not Found - Filing not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result[0],
      message: 'Labour board filing updated successfully',
    });

  } catch (error) {
    logger.error('Failed to update labour board filing', error as Error, {
      filingId: request.nextUrl.searchParams.get('id'),
      correlationId: request.headers.get('x-correlation-id'),
    });
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
