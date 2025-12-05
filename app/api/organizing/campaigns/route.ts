/**
 * API Route: Organizing Campaigns
 * Manage organizing campaigns for union certification
 * Phase 3: Organizing & Certification
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db/db';
import { organizingCampaigns } from '@/db/migrations/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/organizing/campaigns
 * List organizing campaigns for an organization
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
    const status = searchParams.get('status');

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Bad Request - organizationId is required' },
        { status: 400 }
      );
    }

    // Build query conditions
    const conditions = [eq(organizingCampaigns.organizationId, organizationId)];
    
    if (status) {
      conditions.push(eq(organizingCampaigns.campaignStatus, status as any));
    }

    // Fetch campaigns
    const campaigns = await db
      .select()
      .from(organizingCampaigns)
      .where(and(...conditions))
      .orderBy(desc(organizingCampaigns.campaignLaunchDate));

    return NextResponse.json({
      success: true,
      data: campaigns,
      count: campaigns.length,
    });

  } catch (error) {
    logger.error('Failed to fetch organizing campaigns', error as Error, {      organizationId: request.nextUrl.searchParams.get('organizationId'),
      correlationId: request.headers.get('x-correlation-id'),
    });
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/organizing/campaigns
 * Create a new organizing campaign
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
      campaignName,
      campaignCode,
      campaignType,
      targetEmployerName,
      estimatedEligibleWorkers,
      laborBoardJurisdiction,
    } = body;

    // Validate required fields
    if (!organizationId || !campaignName || !campaignCode || !campaignType || !targetEmployerName) {
      return NextResponse.json(
        { error: 'Bad Request - organizationId, campaignName, campaignCode, campaignType, and targetEmployerName are required' },
        { status: 400 }
      );
    }

    // Create campaign
    const [newCampaign] = await db
      .insert(organizingCampaigns)
      .values({
        organizationId,
        campaignName,
        campaignCode,
        campaignType,
        targetEmployerName,
        estimatedEligibleWorkers,
        laborBoardJurisdiction,
        campaignStatus: 'research',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: newCampaign,
      message: 'Organizing campaign created successfully',
    }, { status: 201 });

  } catch (error) {
    logger.error('Failed to create organizing campaign', error as Error, {      correlationId: request.headers.get('x-correlation-id'),
    });
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
