/**
 * @fileoverview CourtLens Supabase Package - Main Export
 * 
 * This module exports all Supabase-related functionality for the CourtLens
 * billing system, including database types, client configuration, and helper functions.
 */

// =========================================================================
// TYPE EXPORTS
// =========================================================================

export type {
  // Core Database Types
  Database,
  
  // Entity Types
  Organization,
  User,
  Client,
  Matter,
  TimeEntry,
  Expense,
  Invoice,
  Payment,
  TrustAccount,
  TrustTransaction,
  TrustLedger,
  AuditLog,
  
  // View Types
  ClientAging,
  MatterFinancials,
  
  // Form and Input Types
  TimeEntryFormData,
  InvoiceFormData,
  TrustTransactionFormData,
  
  // Filter Types
  TimeEntryFilters,
  InvoiceFilters,
  
  // Response Types
  PaginatedResponse,
  ApiResponse,
  
  // Utility Types
  UUID,
  
} from './types';

// =========================================================================
// CLIENT EXPORTS
// =========================================================================

export {
  // Client Functions
  getSupabaseClient,
  getSupabaseServiceClient,
  supabaseService,
  
  // Helper Functions
  executeQuery,
  getCurrentUserOrganizationId,
  checkUserRole,
  batchInsert,
  getPaginatedResults,
  
  // Real-time Functions
  subscribeToTableChanges,
  subscribeToUserChanges,
  
  // Audit Functions
  logAuditAction,
  
  // Trust Account Functions
  validateTrustTransaction,
  
  // Error Handling
  formatSupabaseError,
  
} from './client';

// =========================================================================
// DEFAULT EXPORT
// =========================================================================

export { default } from './client';
