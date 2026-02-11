import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/services/financial-service/src/db';
import { budgets, budgetLineItems, organizations } from '@/services/financial-service/src/db/schema';
import { eq, and, desc, gte, lte, or, sql } from 'drizzle-orm';
import { withApiAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { logApiAuditEvent } from '@/lib/middleware/api-security';
import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';

const createBudgetSchema = z.object({
  budgetName: z.string().min(1).max(255),
  fiscalYear: z.number().int().min(2000).max(2100),
  periodType: z.enum(['annual', 'quarterly', 'monthly', 'project']).default('annual'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  totalBudget: z.string().regex(/^\d+(\.\d{1,2})?$/),
  notes: z.string().optional(),
  lineItems: z.array(z.object({
    accountCode: z.string().min(1).max(50),
    accountName: z.string().min(1).max(255),
    departmentId: z.string().uuid().optional(),
    categoryId: z.string().uuid().optional(),
    allocatedAmount: z.string().regex(/^\d+(\.\d{1,2})?$/),
    notes: z.string().optional(),
  })).optional(),
});

/**
 * GET /api/financial/budgets
 * List all budgets for the organization
 * Required role: Financial Officer (level 85+)
 */
export const GET = withApiAuth(async (request: NextRequest, context) => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return standardErrorResponse(ErrorCode.UNAUTHORIZED, 'Authentication required');
    }

    // Check minimum role level (85 = Financial Officer, Secretary-Treasurer)
    const userLevel = (user as any).roleLevel || 0;
    if (userLevel < 85) {
      return standardErrorResponse(ErrorCode.FORBIDDEN, 'Requires Financial Officer role (level 85+)');
    }

    const { organizationId } = context as any;
    const { searchParams } = new URL(request.url);
    
    const fiscalYear = searchParams.get('fiscalYear');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = db
      .select({
        id: budgets.id,
        budgetName: budgets.budgetName,
        fiscalYear: budgets.fiscalYear,
        periodType: budgets.periodType,
        startDate: budgets.startDate,
        endDate: budgets.endDate,
        totalBudget: budgets.totalBudget,
        totalAllocated: budgets.totalAllocated,
        totalSpent: budgets.totalSpent,
        totalCommitted: budgets.totalCommitted,
        status: budgets.status,
        approvedBy: budgets.approvedBy,
        approvedAt: budgets.approvedAt,
        notes: budgets.notes,
        createdAt: budgets.createdAt,
        updatedAt: budgets.updatedAt,
        createdBy: budgets.createdBy,
      })
      .from(budgets)
      .where(eq(budgets.organizationId, organizationId));

    if (fiscalYear) {
      query = query.where(and(
        eq(budgets.organizationId, organizationId),
        eq(budgets.fiscalYear, parseInt(fiscalYear))
      )) as any;
    }

    if (status) {
      query = query.where(and(
        eq(budgets.organizationId, organizationId),
        eq(budgets.status, status as any)
      )) as any;
    }

    const results = await query
      .orderBy(desc(budgets.fiscalYear), desc(budgets.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(budgets)
      .where(eq(budgets.organizationId, organizationId));

    await logApiAuditEvent({
      timestamp: new Date().toISOString(),
      userId: user.id,
      endpoint: '/api/financial/budgets',
      method: 'GET',
      eventType: 'read',
      severity: 'low',
      details: { fiscalYear, status, count: results.length },
    });

    return standardSuccessResponse({
      budgets: results,
      pagination: {
        total: Number(count),
        limit,
        offset,
        hasMore: offset + results.length < Number(count),
      },
    });

  } catch (error) {
    console.error('Error fetching budgets:', error);
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch budgets',
      error
    );
  }
});

/**
 * POST /api/financial/budgets
 * Create a new budget
 * Required role: Financial Officer (level 85+)
 */
export const POST = withApiAuth(async (request: NextRequest, context) => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return standardErrorResponse(ErrorCode.UNAUTHORIZED, 'Authentication required');
    }

    // Check minimum role level
    const userLevel = (user as any).roleLevel || 0;
    if (userLevel < 85) {
      return standardErrorResponse(ErrorCode.FORBIDDEN, 'Requires Financial Officer role (level 85+)');
    }

    const { organizationId } = context as any;
    const body = await request.json();
    
    const parsed = createBudgetSchema.safeParse(body);
    if (!parsed.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request body',
        parsed.error
      );
    }

    const data = parsed.data;

    // Create budget
    const [budget] = await db.insert(budgets).values({
      organizationId,
      budgetName: data.budgetName,
      fiscalYear: data.fiscalYear,
      periodType: data.periodType,
      startDate: data.startDate,
      endDate: data.endDate,
      totalBudget: data.totalBudget,
      totalAllocated: '0.00',
      totalSpent: '0.00',
      totalCommitted: '0.00',
      status: 'draft',
      notes: data.notes,
      createdBy: user.id,
    }).returning();

    // Create line items if provided
    if (data.lineItems && data.lineItems.length > 0) {
      const lineItemsData = data.lineItems.map(item => ({
        budgetId: budget.id,
        accountCode: item.accountCode,
        accountName: item.accountName,
        departmentId: item.departmentId,
        categoryId: item.categoryId,
        allocatedAmount: item.allocatedAmount,
        spentAmount: '0.00',
        committedAmount: '0.00',
        remainingAmount: item.allocatedAmount,
        notes: item.notes,
      }));

      await db.insert(budgetLineItems).values(lineItemsData);

      // Update total allocated
      const totalAllocated = data.lineItems.reduce((sum, item) => 
        sum + parseFloat(item.allocatedAmount), 0
      ).toFixed(2);

      await db.update(budgets)
        .set({ totalAllocated })
        .where(eq(budgets.id, budget.id));
    }

    await logApiAuditEvent({
      timestamp: new Date().toISOString(),
      userId: user.id,
      endpoint: '/api/financial/budgets',
      method: 'POST',
      eventType: 'create',
      severity: 'medium',
      details: { budgetId: budget.id, budgetName: data.budgetName },
    });

    return standardSuccessResponse({
      budget,
      message: 'Budget created successfully',
    }, 201);

  } catch (error: any) {
    if (error?.message?.includes('unique_budget_name_year')) {
      return standardErrorResponse(
        ErrorCode.DUPLICATE_ENTRY,
        'A budget with this name already exists for this fiscal year'
      );
    }
    console.error('Error creating budget:', error);
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to create budget',
      error
    );
  }
});
