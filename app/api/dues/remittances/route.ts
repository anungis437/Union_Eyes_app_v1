/**
 * Employer Remittances API
 * 
 * Manages employer remittance uploads, processing, and reconciliation
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { 
  employerRemittances, 
  remittanceLineItems,
  remittanceExceptions 
} from '@/db/schema/dues-finance-schema';
import { and, desc } from 'drizzle-orm';
import { requireUserForOrganization } from '@/lib/api-auth-guard';

// Validation schema for creating remittance
const createRemittanceSchema = z.object({
  employerId: z.string().uuid(),
  organizationId: z.string().uuid(),
  periodStart: z.string(),
  periodEnd: z.string(),
  remittanceDate: z.string(),
  remittanceNumber: z.string().optional(),
  totalAmount: z.number(),
  memberCount: z.number().int(),
  fileName: z.string().optional(),
  fileUrl: z.string().optional(),
  notes: z.string().optional(),
});

/**
 * GET /api/dues/remittances
 * List employer remittances with filters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employerId = searchParams.get('employerId');
    const organizationId = searchParams.get('organizationId');
    const status = searchParams.get('status');
    const fiscalYear = searchParams.get('fiscalYear');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // Build query conditions
    const conditions = [];
    if (employerId) {
      conditions.push(eq(employerRemittances.employerId, employerId));
    }
    if (organizationId) {
      conditions.push(eq(employerRemittances.organizationId, organizationId));
    }
    if (status) {
      conditions.push(eq(employerRemittances.processingStatus, status));
    }
    if (fiscalYear) {
      conditions.push(eq(employerRemittances.fiscalYear, parseInt(fiscalYear)));
    }
    if (startDate) {
      conditions.push(gte(employerRemittances.remittanceDate, new Date(startDate)));
    }
    if (endDate) {
      conditions.push(lte(employerRemittances.remittanceDate, new Date(endDate)));
    }

    // Fetch remittances with exception counts
    const remittances = await db
      .select({
        id: employerRemittances.id,
        employerId: employerRemittances.employerId,
        organizationId: employerRemittances.organizationId,
        periodStart: employerRemittances.periodStart,
        periodEnd: employerRemittances.periodEnd,
        fiscalYear: employerRemittances.fiscalYear,
        fiscalMonth: employerRemittances.fiscalMonth,
        remittanceDate: employerRemittances.remittanceDate,
        remittanceNumber: employerRemittances.remittanceNumber,
        totalAmount: employerRemittances.totalAmount,
        memberCount: employerRemittances.memberCount,
        fileName: employerRemittances.fileName,
        processingStatus: employerRemittances.processingStatus,
        recordsTotal: employerRemittances.recordsTotal,
        recordsProcessed: employerRemittances.recordsProcessed,
        recordsMatched: employerRemittances.recordsMatched,
        recordsException: employerRemittances.recordsException,
        variance: employerRemittances.variance,
        isReconciled: employerRemittances.isReconciled,
        createdAt: employerRemittances.createdAt,
        updatedAt: employerRemittances.updatedAt,
      })
      .from(employerRemittances)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(employerRemittances.remittanceDate))
      .limit(limit)
      .offset(offset);

    // Count total
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(employerRemittances)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return NextResponse.json({
      remittances,
      pagination: {
        page,
        limit,
        total: Number(count),
        totalPages: Math.ceil(Number(count) / limit),
      },
    });
  } catch (error: Record<string, unknown>) {
    console.error('Error fetching remittances:', error);
    return NextResponse.json(
      { error: 'Failed to fetch remittances', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/dues/remittances
 * Create new employer remittance
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createRemittanceSchema.parse(body);
    const authContext = await requireUserForOrganization(validatedData.organizationId);

    // Calculate fiscal period
    const periodStart = new Date(validatedData.periodStart);
    const fiscalYear = periodStart.getFullYear();
    const fiscalMonth = periodStart.getMonth() + 1;

    // Create remittance
    const [newRemittance] = await db
      .insert(employerRemittances)
      .values({
        ...validatedData,
        periodStart: new Date(validatedData.periodStart),
        periodEnd: new Date(validatedData.periodEnd),
        remittanceDate: new Date(validatedData.remittanceDate),
        totalAmount: validatedData.totalAmount.toString(),
        fiscalYear,
        fiscalMonth,
        processingStatus: 'pending',
        recordsTotal: 0,
        recordsProcessed: 0,
        recordsMatched: 0,
        recordsException: 0,
        createdBy: authContext.userId,
        lastModifiedBy: authContext.userId,
      })
      .returning();

    return NextResponse.json(
      {
        message: 'Remittance created successfully',
        remittance: newRemittance,
      },
      { status: 201 }
    );
  } catch (error: Record<string, unknown>) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message.startsWith('Forbidden')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating remittance:', error);
    return NextResponse.json(
      { error: 'Failed to create remittance', details: error.message },
      { status: 500 }
    );
  }
}
