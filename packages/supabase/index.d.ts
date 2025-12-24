/**
 * @fileoverview CourtLens Supabase Package - Main Export
 *
 * This module exports all Supabase-related functionality for the CourtLens
 * billing system, including database types, client configuration, and helper functions.
 */
export type { Database, Organization, User, Client, Matter, TimeEntry, Expense, Invoice, Payment, TrustAccount, TrustTransaction, TrustLedger, AuditLog, ClientAging, MatterFinancials, TimeEntryFormData, InvoiceFormData, TrustTransactionFormData, TimeEntryFilters, InvoiceFilters, PaginatedResponse, ApiResponse, UUID, } from './types';
export { getSupabaseClient, getSupabaseServiceClient, supabaseService, executeQuery, getCurrentUserOrganizationId, checkUserRole, batchInsert, getPaginatedResults, subscribeToTableChanges, subscribeToUserChanges, logAuditAction, validateTrustTransaction, formatSupabaseError, } from './client';
export { default } from './client';
//# sourceMappingURL=index.d.ts.map