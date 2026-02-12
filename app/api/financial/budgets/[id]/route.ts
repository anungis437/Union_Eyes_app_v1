import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/services/financial-service/src/db';
import { budgets, budgetLineItems } from '@/services/financial-service/src/db/schema';
import { eq, and } from 'drizzle-orm';
import { withApiAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { logApiAuditEvent } from '@/lib/middleware/api-security';
import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';

interface AuthUser {
  id: string;
  roleLevel?: number;
}

interface RequestContext {
  organizationId: string;
  params: { id: string };
}

interface BudgetUpdateData {
  budgetName?: string;
  startDate?: string;
  endDate?: string;
  totalBudget?: string;
  status?: 'draft' | 'approved' | 'active' | 'closed' | 'revised';
  notes?: string;
  updatedAt: string;
  approvedBy?: string;
  approvedAt?: string;
}

const updateBudgetSchema = z.object({
  budgetName: z.string().min(1).max(255).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  totalBudget: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  status: z.enum(['draft', 'approved', 'active', 'closed', 'revised']).optional(),
  notes: z.string().optional(),
});

/**
 * GET /api/financial/budgets/[id]
 * Get budget details with line items
 */
export const GET = withApiAuth(async (request: NextRequest, context) => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return standardErrorResponse(ErrorCode.UNAUTHORIZED, 'Authentication required');
    }

    const userLevel = (user as AuthUser).roleLevel || 0;
    if (userLevel < 85) {
      return standardErrorResponse(ErrorCode.FORBIDDEN, 'Requires Financial Officer role (level 85+)');
    }

    const { organizationId } = context as RequestContext;
    const { params } = context as RequestContext;
    const budgetId = params.id;

    const [budget] = await db
      .select()
      .from(budgets)
      .where(and(
        eq(budgets.id, budgetId),
        eq(budgets.organizationId, organizationId)
      ));

    if (!budget) {
      return standardErrorResponse(ErrorCode.RESOURCE_NOT_FOUND, 'Budget not found');
    }

    const lineItems = await db
      .select()
      .from(budgetLineItems)
      .where(eq(budgetLineItems.budgetId, budgetId))
      .orderBy(budgetLineItems.accountCode);

    await logApiAuditEvent({
      timestamp: new Date().toISOString(),
      userId: user.id,
      endpoint: `/api/financial/budgets/${budgetId}`,
      method: 'GET',
      eventType: 'read',
      severity: 'low',
      details: { budgetId },
    });

    return standardSuccessResponse({
      budget,
      lineItems,
    });

  } catch (error) {
    console.error('Error fetching budget:', error);
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch budget',
      error
    );
  }
});

/**
 * PATCH /api/financial/budgets/[id]
 * Update budget
 */
export const PATCH = withApiAuth(async (request: NextRequest, context) => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return standardErrorResponse(ErrorCode.UNAUTHORIZED, 'Authentication required');
    }

    const userLevel = (user as AuthUser).roleLevel || 0;
    if (userLevel < 85) {
      return standardErrorResponse(ErrorCode.FORBIDDEN, 'Requires Financial Officer role (level 85+)');
    }

    const { organizationId } = context as RequestContext;
    const { params } = context as RequestContext;
    const budgetId = params.id;

    const body = await request.json();
    const parsed = updateBudgetSchema.safeParse(body);
    
    if (!parsed.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request body',
        parsed.error
      );
    }

    const data = parsed.data;

    // Verify budget exists and belongs to organization
    const [existingBudget] = await db
      .select()
      .from(budgets)
      .where(and(
        eq(budgets.id, budgetId),
        eq(budgets.organizationId, organizationId)
      ));

    if (!existingBudget) {
      return standardErrorResponse(ErrorCode.RESOURCE_NOT_FOUND, 'Budget not found');
    }

    // Update budget
    const updateData: BudgetUpdateData = { ...data, updatedAt: new Date().toISOString() };
    
    // If status is being changed to approved, record approval
    if (data.status === 'approved' && existingBudget.status !== 'approved') {
      updateData.approvedBy = user.id;
      updateData.approvedAt = new Date().toISOString();
    }

    const [updatedBudget] = await db
      .update(budgets)
      .set(updateData)
      .where(eq(budgets.id, budgetId))
      .returning();

    await logApiAuditEvent({
      timestamp: new Date().toISOString(),
      userId: user.id,
      endpoint: `/api/financial/budgets/${budgetId}`,
      method: 'PATCH',
      eventType: 'update',
      severity: 'medium',
      details: { budgetId, updates: data },
    });

    return standardSuccessResponse({
      budget: updatedBudget,
      message: 'Budget updated successfully',
    });

  } catch (error) {
    console.error('Error updating budget:', error);
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to update budget',
      error
    );
  }
});

/**
 * DELETE /api/financial/budgets/[id]
 * Delete budget (only if draft status)
 */
export const DELETE = withApiAuth(async (request: NextRequest, context) => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return standardErrorResponse(ErrorCode.UNAUTHORIZED, 'Authentication required');
    }

    const userLevel = (user as AuthUser).roleLevel || 0;
    if (userLevel < 85) {
      return standardErrorResponse(ErrorCode.FORBIDDEN, 'Requires Financial Officer role (level 85+)');
    }

    const { organizationId } = context as RequestContext;
    const { params } = context as RequestContext;
    const budgetId = params.id;

    // Verify budget exists and belongs to organization
    const [existingBudget] = await db
      .select()
      .from(budgets)
      .where(and(
        eq(budgets.id, budgetId),
        eq(budgets.organizationId, organizationId)
      ));

    if (!existingBudget) {
      return standardErrorResponse(ErrorCode.RESOURCE_NOT_FOUND, 'Budget not found');
    }

    // Only allow deletion of draft budgets
    if (existingBudget.status !== 'draft') {
      return standardErrorResponse(
        ErrorCode.FORBIDDEN,
        'Only draft budgets can be deleted'
      );
    }

    // Delete budget (cascade will delete line items)
    await db.delete(budgets).where(eq(budgets.id, budgetId));

    await logApiAuditEvent({
      timestamp: new Date().toISOString(),
      userId: user.id,
      endpoint: `/api/financial/budgets/${budgetId}`,
      method: 'DELETE',
      eventType: 'delete',
      severity: 'high',
      details: { budgetId, budgetName: existingBudget.budgetName },
    });

    return standardSuccessResponse({
      message: 'Budget deleted successfully',
    });

  } catch (error) {
    console.error('Error deleting budget:', error);
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to delete budget',
      error
    );
  }
});
