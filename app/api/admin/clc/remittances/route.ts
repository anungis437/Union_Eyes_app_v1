/**
 * CLC Per-Capita Remittances API Routes
 * Purpose: List and calculate remittances
 * 
 * Endpoints:
 * - GET /api/admin/clc/remittances - List remittances with filters
 * - POST /api/admin/clc/remittances/calculate - Trigger manual calculation
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { organizations, perCapitaRemittances } from '@/db/schema';
import { and, eq, gte, lte, inArray, sql } from 'drizzle-orm';
import { 
  PerCapitaCalculator,
  calculatePerCapita,
  calculateAllPerCapita,
  savePerCapitaRemittances 
} from '@/services/clc/per-capita-calculator';

// =====================================================================================
// GET - List remittances with filters
// =====================================================================================

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Set session context for RLS
    await db.execute(sql`SET app.current_user_id = ${userId}`);

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const organizationId = searchParams.get('organizationId');
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : null;
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : null;
    const dueDateFrom = searchParams.get('dueDateFrom');
    const dueDateTo = searchParams.get('dueDateTo');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');
    const offset = (page - 1) * pageSize;

    // Build WHERE conditions
    const conditions = [];
    
    if (status) {
      conditions.push(eq(perCapitaRemittances.status, status as any));
    }
    
    if (organizationId) {
      // Filter by either from_organization_id OR to_organization_id
      conditions.push(
        sql`(${perCapitaRemittances.fromOrganizationId} = ${organizationId} OR ${perCapitaRemittances.toOrganizationId} = ${organizationId})`
      );
    }
    
    if (month !== null) {
      conditions.push(eq(perCapitaRemittances.remittanceMonth, month));
    }
    
    if (year !== null) {
      conditions.push(eq(perCapitaRemittances.remittanceYear, year));
    }
    
    if (dueDateFrom) {
      conditions.push(gte(perCapitaRemittances.dueDate, dueDateFrom));
    }
    
    if (dueDateTo) {
      conditions.push(lte(perCapitaRemittances.dueDate, dueDateTo));
    }

    // Fetch remittances with organization details
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    const remittances = await db
      .select({
        id: perCapitaRemittances.id,
        remittanceMonth: perCapitaRemittances.remittanceMonth,
        remittanceYear: perCapitaRemittances.remittanceYear,
        fromOrganizationId: perCapitaRemittances.fromOrganizationId,
        toOrganizationId: perCapitaRemittances.toOrganizationId,
        totalMembers: perCapitaRemittances.totalMembers,
        goodStandingMembers: perCapitaRemittances.goodStandingMembers,
        remittableMembers: perCapitaRemittances.remittableMembers,
        perCapitaRate: perCapitaRemittances.perCapitaRate,
        totalAmount: perCapitaRemittances.totalAmount,
        dueDate: perCapitaRemittances.dueDate,
        status: perCapitaRemittances.status,
        submittedDate: perCapitaRemittances.submittedDate,
        paidDate: perCapitaRemittances.paidDate,
        clcAccountCode: perCapitaRemittances.clcAccountCode,
        glAccount: perCapitaRemittances.glAccount,
        createdAt: perCapitaRemittances.createdAt,
        updatedAt: perCapitaRemittances.updatedAt,
      })
      .from(perCapitaRemittances)
      .where(whereClause)
      .orderBy(sql`${perCapitaRemittances.dueDate} DESC, ${perCapitaRemittances.createdAt} DESC`)
      .limit(pageSize)
      .offset(offset);

    // Get total count for pagination
    const [countResult] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(perCapitaRemittances)
      .where(whereClause);
    
    const totalCount = Number(countResult.count);
    const totalPages = Math.ceil(totalCount / pageSize);

    // Fetch organization details for all remittances
    const orgIds = new Set<string>();
    remittances.forEach(r => {
      orgIds.add(r.fromOrganizationId);
      orgIds.add(r.toOrganizationId);
    });

    const orgs = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        clcAffiliateCode: organizations.clcAffiliateCode,
      })
      .from(organizations)
      .where(inArray(organizations.id, Array.from(orgIds)));

    const orgMap = new Map(orgs.map(o => [o.id, o]));

    // Enrich remittances with organization names
    const enrichedRemittances = remittances.map(r => ({
      ...r,
      fromOrganization: orgMap.get(r.fromOrganizationId),
      toOrganization: orgMap.get(r.toOrganizationId),
    }));

    return NextResponse.json({
      remittances: enrichedRemittances,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Error fetching remittances:', error);
    return NextResponse.json(
      { error: 'Failed to fetch remittances' },
      { status: 500 }
    );
  }
}

// =====================================================================================
// POST - Calculate remittances
// =====================================================================================

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Set session context for RLS
    await db.execute(sql`SET app.current_user_id = ${userId}`);

    // Parse request body
    const body = await request.json();
    const { organizationId, month, year, saveResults = false } = body;

    // Validate required fields
    if (!month || !year) {
      return NextResponse.json(
        { error: 'Month and year are required' },
        { status: 400 }
      );
    }

    // Calculate remittances
    let calculations;
    
    if (organizationId) {
      // Calculate for single organization
      const calculation = await calculatePerCapita(organizationId, month, year);
      calculations = calculation ? [calculation] : [];
    } else {
      // Calculate for all organizations
      calculations = await calculateAllPerCapita(month, year);
    }

    // Save to database if requested
    let saveResult = null;
    if (saveResults && calculations.length > 0) {
      saveResult = await savePerCapitaRemittances(calculations);
    }

    return NextResponse.json({
      calculations,
      saveResult,
      message: organizationId
        ? `Calculated remittance for 1 organization`
        : `Calculated remittances for ${calculations.length} organizations`,
    });
  } catch (error) {
    console.error('Error calculating remittances:', error);
    return NextResponse.json(
      { error: 'Failed to calculate remittances' },
      { status: 500 }
    );
  }
}
