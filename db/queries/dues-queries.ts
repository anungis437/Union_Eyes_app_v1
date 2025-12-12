"use server";

import { db } from "@/db/db";
import { eq, and, desc, sql, sum, gte, lte } from "drizzle-orm";
import { duesTransactions, type DuesTransaction, type NewDuesTransaction } from "../schema/dues-transactions-schema";

/**
 * Get dues balance summary for a member
 */
export const getDuesBalanceByMember = async (memberId: string) => {
  try {
    // Get all transactions for the member
    const transactions = await db
      .select()
      .from(duesTransactions)
      .where(eq(duesTransactions.memberId, memberId))
      .orderBy(desc(duesTransactions.dueDate));

    // Calculate totals
    const pending = transactions.filter(t => t.status === 'pending');
    const overdue = transactions.filter(t => t.status === 'overdue');
    const paid = transactions.filter(t => t.status === 'paid');

    const pendingBalance = pending.reduce((sum, t) => sum + parseFloat(t.totalAmount), 0);
    const overdueBalance = overdue.reduce((sum, t) => sum + parseFloat(t.totalAmount), 0);
    const paidTotal = paid.reduce((sum, t) => sum + parseFloat(t.totalAmount), 0);

    return {
      memberId,
      currentBalance: pendingBalance + overdueBalance,
      pendingBalance,
      overdueBalance,
      paidTotal,
      pendingTransactions: pending.length,
      overdueTransactions: overdue.length,
      lastPaymentDate: paid[0]?.paidDate || null,
      transactions,
    };
  } catch (error) {
    console.error("Error getting dues balance:", error);
    throw new Error("Failed to get dues balance");
  }
};

/**
 * Get dues transactions for a member
 */
export const getDuesTransactionsByMember = async (
  memberId: string,
  options?: {
    status?: 'pending' | 'paid' | 'overdue' | 'waived' | 'cancelled';
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }
) => {
  try {
    let query = db
      .select()
      .from(duesTransactions)
      .where(eq(duesTransactions.memberId, memberId))
      .orderBy(desc(duesTransactions.dueDate));

    if (options?.limit) {
      query = query.limit(options.limit) as typeof query;
    }

    const transactions = await query;

    // Apply additional filters in-memory for simplicity
    let filtered = transactions;
    
    if (options?.status) {
      filtered = filtered.filter(t => t.status === options.status);
    }
    
    if (options?.startDate) {
      filtered = filtered.filter(t => new Date(t.periodStart) >= options.startDate!);
    }
    
    if (options?.endDate) {
      filtered = filtered.filter(t => new Date(t.periodEnd) <= options.endDate!);
    }

    return filtered;
  } catch (error) {
    console.error("Error getting dues transactions:", error);
    throw new Error("Failed to get dues transactions");
  }
};

/**
 * Get dues transactions for an organization
 */
export const getDuesTransactionsByOrganization = async (
  organizationId: string,
  options?: {
    status?: 'pending' | 'paid' | 'overdue' | 'waived' | 'cancelled';
    startDate?: Date;
    endDate?: Date;
  }
) => {
  try {
    const transactions = await db
      .select()
      .from(duesTransactions)
      .where(eq(duesTransactions.organizationId, organizationId))
      .orderBy(desc(duesTransactions.dueDate));

    let filtered = transactions;
    
    if (options?.status) {
      filtered = filtered.filter(t => t.status === options.status);
    }
    
    if (options?.startDate) {
      filtered = filtered.filter(t => new Date(t.periodStart) >= options.startDate!);
    }
    
    if (options?.endDate) {
      filtered = filtered.filter(t => new Date(t.periodEnd) <= options.endDate!);
    }

    return filtered;
  } catch (error) {
    console.error("Error getting organization dues:", error);
    throw new Error("Failed to get organization dues");
  }
};

/**
 * Create a new dues transaction
 */
export const createDuesTransaction = async (data: NewDuesTransaction) => {
  try {
    const [transaction] = await db
      .insert(duesTransactions)
      .values(data)
      .returning();

    return transaction;
  } catch (error) {
    console.error("Error creating dues transaction:", error);
    throw new Error("Failed to create dues transaction");
  }
};

/**
 * Update dues transaction status (e.g., when payment is received)
 */
export const updateDuesTransactionStatus = async (
  transactionId: string,
  status: 'pending' | 'paid' | 'overdue' | 'waived' | 'cancelled',
  paymentDetails?: {
    paymentMethod?: string;
    paymentReference?: string;
    receiptUrl?: string;
  }
) => {
  try {
    const updateData: Partial<DuesTransaction> = {
      status,
      updatedAt: new Date(),
    };

    if (status === 'paid') {
      updateData.paidDate = new Date();
      if (paymentDetails) {
        updateData.paymentMethod = paymentDetails.paymentMethod;
        updateData.paymentReference = paymentDetails.paymentReference;
        updateData.receiptUrl = paymentDetails.receiptUrl;
      }
    }

    const [updated] = await db
      .update(duesTransactions)
      .set(updateData)
      .where(eq(duesTransactions.id, transactionId))
      .returning();

    return updated;
  } catch (error) {
    console.error("Error updating dues transaction:", error);
    throw new Error("Failed to update dues transaction");
  }
};

/**
 * Mark overdue transactions (to be called by a scheduled job)
 */
export const markOverdueTransactions = async () => {
  try {
    const today = new Date();
    
    const updated = await db
      .update(duesTransactions)
      .set({
        status: 'overdue',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(duesTransactions.status, 'pending'),
          sql`${duesTransactions.dueDate} < ${today.toISOString().split('T')[0]}`
        )
      )
      .returning();

    return updated.length;
  } catch (error) {
    console.error("Error marking overdue transactions:", error);
    throw new Error("Failed to mark overdue transactions");
  }
};

/**
 * Get dues summary for an organization (for admin dashboard)
 */
export const getOrganizationDuesSummary = async (organizationId: string) => {
  try {
    const transactions = await db
      .select()
      .from(duesTransactions)
      .where(eq(duesTransactions.organizationId, organizationId));

    const pending = transactions.filter(t => t.status === 'pending');
    const overdue = transactions.filter(t => t.status === 'overdue');
    const paid = transactions.filter(t => t.status === 'paid');
    const waived = transactions.filter(t => t.status === 'waived');

    const pendingTotal = pending.reduce((sum, t) => sum + parseFloat(t.totalAmount), 0);
    const overdueTotal = overdue.reduce((sum, t) => sum + parseFloat(t.totalAmount), 0);
    const paidTotal = paid.reduce((sum, t) => sum + parseFloat(t.totalAmount), 0);
    const waivedTotal = waived.reduce((sum, t) => sum + parseFloat(t.totalAmount), 0);

    // Get unique members
    const uniqueMembers = new Set(transactions.map(t => t.memberId));
    const membersWithOverdue = new Set(overdue.map(t => t.memberId));

    return {
      organizationId,
      totalCollected: paidTotal,
      totalPending: pendingTotal,
      totalOverdue: overdueTotal,
      totalWaived: waivedTotal,
      totalOutstanding: pendingTotal + overdueTotal,
      transactionCount: {
        pending: pending.length,
        overdue: overdue.length,
        paid: paid.length,
        waived: waived.length,
        total: transactions.length,
      },
      memberCount: {
        total: uniqueMembers.size,
        withOverdue: membersWithOverdue.size,
      },
    };
  } catch (error) {
    console.error("Error getting organization dues summary:", error);
    throw new Error("Failed to get organization dues summary");
  }
};
