/**
 * @fileoverview CourtLens Supabase Package - Main Export
 *
 * This module exports all Supabase-related functionality for the CourtLens
 * billing system, including database types, client configuration, and helper functions.
 */
// =========================================================================
// CLIENT EXPORTS
// =========================================================================
export { 
// Client Functions
getSupabaseClient, getSupabaseServiceClient, supabaseService, 
// Helper Functions
executeQuery, getCurrentUserOrganizationId, checkUserRole, batchInsert, getPaginatedResults, 
// Real-time Functions
subscribeToTableChanges, subscribeToUserChanges, 
// Audit Functions
logAuditAction, 
// Trust Account Functions
validateTrustTransaction, 
// Error Handling
formatSupabaseError, } from './client';
// =========================================================================
// DEFAULT EXPORT
// =========================================================================
export { default } from './client';
//# sourceMappingURL=index.js.map