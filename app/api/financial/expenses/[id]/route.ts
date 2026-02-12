import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/services/financial-service/src/db';
import { expenseRequests, expenseApprovals, budgetLineItems } from '@/services/financial-service/src/db/schema';
import { eq, and } from 'drizzle-orm';

interface AuthUser {
  id: string;
  roleLevel?: number;
}

interface RequestContext {
  organizationId: string;
  params: {
    id: string;
  };
}
import { withApiAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { logApiAuditEvent } from '@/lib/middleware/api-security';
import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';

const updateExpenseSchema = z.object({
  status: z.enum(['draft', 'submitted', 'approved', 'rejected', 'paid', 'cancelled']).optional(),
  approvalAction: z.enum(['approve', 'reject']).optional(),
  approvalComments: z.string().optional(),
  paidAt: z.string().optional(),
  paymentReference: z.string().optional(),
  notes: z.string().optional(),
});

/**
 * GET /api/financial/expenses/[id]
 * Get expense details with approval chain
 */
export const GET = withApiAuth(async (request: NextRequest, context) => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return standardErrorResponse(ErrorCode.UNAUTHORIZED, 'Authentication required');
    }

    const { organizationId, params } = context as RequestContext;
    const expenseId = params.id;

    const [expense] = await db
      .select()
      .from(expenseRequests)
      .where(and(
        eq(expenseRequests.id, expenseId),
        eq(expenseRequests.organizationId, organizationId)
      ));

    if (!expense) {
      return standardErrorResponse(ErrorCode.RESOURCE_NOT_FOUND, 'Expense not found');
    }

    const userLevel = (user as AuthUser).roleLevel || 0;

    // Non-financial officers can only view their own expenses
    if (userLevel < 85 && expense.requesterId !== user.id) {
      return standardErrorResponse(ErrorCode.FORBIDDEN, 'Access denied');
    }

    // Get approval chain
    const approvals = await db
      .select()
      .from(expenseApprovals)
      .where(eq(expenseApprovals.expenseRequestId, expenseId))
      .orderBy(expenseApprovals.approverLevel, expenseApprovals.sortOrder);

    await logApiAuditEvent({
      timestamp: new Date().toISOString(),
      userId: user.id,
      endpoint: `/api/financial/expenses/${expenseId}`,
      method: 'GET',
      eventType: 'read',
      severity: 'low',
      details: { expenseId },
    });

    return standardSuccessResponse({
      expense,
      approvals,
    });

  } catch (error) {
    console.error('Error fetching expense:', error);
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch expense',
      error
    );
  }
});

/**
 * PATCH /api/financial/expenses/[id]
 * Update expense (submit, approve, reject, mark as paid)
 */
export const PATCH = withApiAuth(async (request: NextRequest, context) => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return standardErrorResponse(ErrorCode.UNAUTHORIZED, 'Authentication required');
    }

    const { organizationId, params } = context as RequestContext;
    const expenseId = params.id;

    const body = await request.json();
    const parsed = updateExpenseSchema.safeParse(body);
    
    if (!parsed.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request body',
        parsed.error
      );
    }

    const data = parsed.data;

    // Verify expense exists
    const [existingExpense] = await db
      .select()
      .from(expenseRequests)
      .where(and(
        eq(expenseRequests.id, expenseId),
        eq(expenseRequests.organizationId, organizationId)
      ));

    if (!existingExpense) {
      return standardErrorResponse(ErrorCode.RESOURCE_NOT_FOUND, 'Expense not found');
    }

    const userLevel = (user as AuthUser).roleLevel || 0;

    // Handle approval actions
    if (data.approvalAction) {
      if (userLevel < 85) {
        return standardErrorResponse(
          ErrorCode.FORBIDDEN,
          'Requires Financial Officer role for approval actions'
        );
      }

      // Find approval record for this user
      const [approval] = await db
        .select()
        .from(expenseApprovals)
        .where(and(
          eq(expenseApprovals.expenseRequestId, expenseId),
          eq(expenseApprovals.approverId, user.id),
          eq(expenseApprovals.status, 'pending')
        ));

      if (!approval) {
        return standardErrorResponse(
          ErrorCode.FORBIDDEN,
          'No pending approval found for this user'
        );
      }

      // Update approval
      await db
        .update(expenseApprovals)
        .set({
          status: data.approvalAction === 'approve' ? 'approved' : 'rejected',
          approvedAt: new Date().toISOString(),
          comments: data.approvalComments,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(expenseApprovals.id, approval.id));

      // Update expense status
      const newStatus = data.approvalAction === 'approve' ? 'approved' : 'rejected';
      const updateData: Partial<typeof expenseRequests.$inferInsert> = {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      };

      if (data.approvalAction === 'approve') {
        updateData.approvedAt = new Date().toISOString();
      } else {
        updateData.rejectionReason = data.approvalComments;
      }

      await db
        .update(expenseRequests)
        .set(updateData)
        .where(eq(expenseRequests.id, expenseId));

      // If approved, update budget line item
      if (data.approvalAction === 'approve' && existingExpense.budgetLineItemId) {
        const [lineItem] = await db
          .select()
          .from(budgetLineItems)
          .where(eq(budgetLineItems.id, existingExpense.budgetLineItemId));

        if (lineItem) {
          const newCommitted = (parseFloat(lineItem.committedAmount) + parseFloat(existingExpense.totalAmount)).toFixed(2);
          const newRemaining = (parseFloat(lineItem.allocatedAmount) - parseFloat(newCommitted) - parseFloat(lineItem.spentAmount)).toFixed(2);

          await db
            .update(budgetLineItems)
            .set({
              committedAmount: newCommitted,
              remainingAmount: newRemaining,
              updatedAt: new Date().toISOString(),
            })
            .where(eq(budgetLineItems.id, existingExpense.budgetLineItemId));
        }
      }

      await logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId: user.id,
        endpoint: `/api/financial/expenses/${expenseId}`,
        method: 'PATCH',
        eventType: 'update',
        severity: 'high',
        details: { 
          expenseId, 
          action: data.approvalAction,
          amount: existingExpense.totalAmount,
        },
      });

      return standardSuccessResponse({
        message: `Expense ${data.approvalAction === 'approve' ? 'approved' : 'rejected'} successfully`,
      });
    }

    // Handle status updates
    if (data.status) {
      // Only requester can submit, only financial officers can mark as paid
      if (data.status === 'submitted' && existingExpense.requesterId !== user.id) {
        return standardErrorResponse(ErrorCode.FORBIDDEN, 'Only requester can submit expense');
      }

      if (data.status === 'paid' && userLevel < 85) {
        return standardErrorResponse(
          ErrorCode.FORBIDDEN,
          'Requires Financial Officer role to mark as paid'
        );
      }

      const updateData: Partial<typeof expenseRequests.$inferInsert> = {
        status: data.status,
        updatedAt: new Date().toISOString(),
      };

      if (data.status === 'submitted') {
        updateData.submittedAt = new Date().toISOString();
      }

      if (data.status === 'paid') {
        updateData.paidAt = data.paidAt || new Date().toISOString();
        updateData.paymentReference = data.paymentReference;

        // Update budget line item
        if (existingExpense.budgetLineItemId) {
          const [lineItem] = await db
            .select()
            .from(budgetLineItems)
            .where(eq(budgetLineItems.id, existingExpense.budgetLineItemId));

          if (lineItem) {
            const newSpent = (parseFloat(lineItem.spentAmount) + parseFloat(existingExpense.totalAmount)).toFixed(2);
            const newCommitted = (parseFloat(lineItem.committedAmount) - parseFloat(existingExpense.totalAmount)).toFixed(2);
            const newRemaining = (parseFloat(lineItem.allocatedAmount) - parseFloat(newSpent)).toFixed(2);

            await db
              .update(budgetLineItems)
              .set({
                spentAmount: newSpent,
                committedAmount: newCommitted,
                remainingAmount: newRemaining,
                updatedAt: new Date().toISOString(),
              })
              .where(eq(budgetLineItems.id, existingExpense.budgetLineItemId));
          }
        }
      }

      if (data.notes) {
updateData.notes = data.notes;
      }

      await db
        .update(expenseRequests)
        .set(updateData)
        .where(eq(expenseRequests.id, expenseId));

      await logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId: user.id,
        endpoint: `/api/financial/expenses/${expenseId}`,
        method: 'PATCH',
        eventType: 'update',
        severity: 'medium',
        details: { expenseId, status: data.status },
      });

      return standardSuccessResponse({
        message: 'Expense updated successfully',
      });
    }

    return standardErrorResponse(ErrorCode.VALIDATION_ERROR, 'No valid update action specified');

  } catch (error) {
    console.error('Error updating expense:', error);
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to update expense',
      error
    );
  }
});
