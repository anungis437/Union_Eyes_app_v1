/**
 * Dues Transactions Schema
 * Database schema for tracking member dues and payments
 */
import { pgTable, text, uuid, numeric, timestamp, date, pgEnum } from 'drizzle-orm/pg-core';

export const transactionStatusEnum = pgEnum('transaction_status', ['pending', 'paid', 'overdue', 'waived', 'cancelled']);

export const duesTransactions = pgTable('dues_transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  memberId: uuid('member_id').notNull(),
  organizationId: uuid('organization_id').notNull(),
  
  // Period covered by this transaction
  periodStart: date('period_start').notNull(),
  periodEnd: date('period_end').notNull(),
  
  // Dues breakdown
  duesAmount: numeric('dues_amount', { precision: 10, scale: 2 }).notNull(),
  copeAmount: numeric('cope_amount', { precision: 10, scale: 2 }).default('0.00'),
  pacAmount: numeric('pac_amount', { precision: 10, scale: 2 }).default('0.00'),
  strikeFundAmount: numeric('strike_fund_amount', { precision: 10, scale: 2 }).default('0.00'),
  lateFeeAmount: numeric('late_fee_amount', { precision: 10, scale: 2 }).default('0.00'),
  totalAmount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(),
  
  // Status and dates
  status: transactionStatusEnum('status').default('pending').notNull(),
  dueDate: date('due_date').notNull(),
  paidDate: timestamp('paid_date'),
  
  // Payment details
  paymentMethod: text('payment_method'), // 'stripe', 'payroll_deduction', 'cheque', 'cash'
  paymentReference: text('payment_reference'), // Stripe payment ID or cheque number
  receiptUrl: text('receipt_url'),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type DuesTransaction = typeof duesTransactions.$inferSelect;
export type NewDuesTransaction = typeof duesTransactions.$inferInsert;
