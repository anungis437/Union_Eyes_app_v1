import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/services/financial-service/src/db';
import { expenseRequests, expenseApprovals, budgets, budgetLineItems } from '@/services/financial-service/src/db/schema';
import { eq, and, desc, or, sql, inArray } from 'drizzle-orm';
import { withApiAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { logApiAuditEvent } from '@/lib/middleware/api-security';
import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';

const createExpenseSchema = z.object({
  expenseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  accountCode: z.string().min(1).max(50),
  budgetId: z.string().uuid().optional(),
  budgetLineItemId: z.string().uuid().optional(),
  vendorId: z.string().uuid().optional(),
  vendorName: z.string().max(255).optional(),
  description: z.string().min(1),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  taxAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional().default('0.00'),
  category: z.string().max(100).optional(),
  paymentMethod: z.string().optional(),
  reimbursementRequired: z.boolean().default(true),
  receiptUrl: z.string().url().optional(),
  attachments: z.array(z.any()).optional(),
  notes: z.string().optional(),
});

/**
 * GET /api/financial/expenses
 * List expense requests (filtered by role and status)
 */
export const GET = withApiAuth(async (request: NextRequest, context) => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return standardErrorResponse(ErrorCode.UNAUTHORIZED, 'Authentication required');
    }

    const { organizationId } = context as any;
    const { searchParams } = new URL(request.url);
    
    const status = searchParams.get('status');
    const requesterId = searchParams.get('requesterId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const myExpenses = searchParams.get('myExpenses') === 'true';
    const pendingApproval = searchParams.get('pendingApproval') === 'true';

    const userLevel = (user as any).roleLevel || 0;

    let conditions: any[] = [eq(expenseRequests.organizationId, organizationId)];

    // If user is viewing their own expenses
    if (myExpenses) {
      conditions.push(eq(expenseRequests.requesterId, user.id));
    }

    // If viewing pending approvals (for managers/executives)
    if (pendingApproval && userLevel >= 85) {
      const pendingApprovals = await db
        .select({ expenseRequestId: expenseApprovals.expenseRequestId })
        .from(expenseApprovals)
        .where(and(
          eq(expenseApprovals.approverId, user.id),
          eq(expenseApprovals.status, 'pending')
        ));

      if (pendingApprovals.length > 0) {
        conditions.push(
          inArray(
            expenseRequests.id,
            pendingApprovals.map(a => a.expenseRequestId)
          )
        );
      }
    }

    if (status) {
      conditions.push(eq(expenseRequests.status, status as any));
    }

    if (requesterId) {
      conditions.push(eq(expenseRequests.requesterId, requesterId));
    }

    // Non-financial officers can only see their own expenses
    if (userLevel < 85 && !myExpenses) {
      conditions.push(eq(expenseRequests.requesterId, user.id));
    }

    const results = await db
      .select()
      .from(expenseRequests)
      .where(and(...conditions))
      .orderBy(desc(expenseRequests.expenseDate))
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(expenseRequests)
      .where(and(...conditions));

    await logApiAuditEvent({
      timestamp: new Date().toISOString(),
      userId: user.id,
      endpoint: '/api/financial/expenses',
      method: 'GET',
      eventType: 'read',
      severity: 'low',
      details: { status, count: results.length },
    });

    return standardSuccessResponse({
      expenses: results,
      pagination: {
        total: Number(count),
        limit,
        offset,
        hasMore: offset + results.length < Number(count),
      },
    });

  } catch (error) {
    console.error('Error fetching expenses:', error);
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch expenses',
      error
    );
  }
});

/**
 * POST /api/financial/expenses
 * Create a new expense request
 */
export const POST = withApiAuth(async (request: NextRequest, context) => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return standardErrorResponse(ErrorCode.UNAUTHORIZED, 'Authentication required');
    }

    const { organizationId } = context as any;
    const body = await request.json();
    
    const parsed = createExpenseSchema.safeParse(body);
    if (!parsed.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request body',
        parsed.error
      );
    }

    const data = parsed.data;

    // Calculate total amount
    const amount = parseFloat(data.amount);
    const taxAmount = parseFloat(data.taxAmount || '0.00');
    const totalAmount = (amount + taxAmount).toFixed(2);

    // Generate request number
    const date = new Date();
    const year = date.getFullYear();
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(expenseRequests)
      .where(eq(expenseRequests.organizationId, organizationId));
    const requestNumber = `EXP-${year}-${String(Number(count) + 1).padStart(5, '0')}`;

    // Validate budget if provided
    if (data.budgetLineItemId) {
      const [lineItem] = await db
        .select()
        .from(budgetLineItems)
        .where(eq(budgetLineItems.id, data.budgetLineItemId));

      if (!lineItem) {
        return standardErrorResponse(
          ErrorCode.RESOURCE_NOT_FOUND,
          'Budget line item not found'
        );
      }

      // Check if sufficient budget remains
      const remaining = parseFloat(lineItem.remainingAmount);
      if (remaining < parseFloat(totalAmount)) {
        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          `Insufficient budget. Remaining: $${remaining.toFixed(2)}`
        );
      }
    }

    // Create expense request
    const [expense] = await db.insert(expenseRequests).values({
      organizationId,
      requestNumber,
      requesterId: user.id,
      budgetId: data.budgetId,
      budgetLineItemId: data.budgetLineItemId,
      expenseDate: data.expenseDate,
      accountCode: data.accountCode,
      vendorId: data.vendorId,
      vendorName: data.vendorName,
      description: data.description,
      amount: data.amount,
      taxAmount: data.taxAmount,
      totalAmount,
      category: data.category,
      paymentMethod: data.paymentMethod,
      reimbursementRequired: data.reimbursementRequired,
      receiptUrl: data.receiptUrl,
      attachments: data.attachments || [],
      status: 'draft',
      notes: data.notes,
    }).returning();

    await logApiAuditEvent({
      timestamp: new Date().toISOString(),
      userId: user.id,
      endpoint: '/api/financial/expenses',
      method: 'POST',
      eventType: 'create',
      severity: 'medium',
      details: { expenseId: expense.id, amount: totalAmount },
    });

    return standardSuccessResponse({
      expense,
      message: 'Expense request created successfully',
    }, 201);

  } catch (error: any) {
    if (error?.message?.includes('unique_expense_request_number')) {
      return standardErrorResponse(
        ErrorCode.DUPLICATE_ENTRY,
        'Request number conflict - please try again'
      );
    }
    console.error('Error creating expense:', error);
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to create expense',
      error
    );
  }
});
