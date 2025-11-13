/**
 * @fileoverview Supabase Configuration and Database Helper
 *
 * This module provides the Supabase client configuration and helper functions
 * for interacting with the CourtLens billing database.
 */
import { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';
/**
 * Get the public Supabase client (with RLS)
 */
export declare const getSupabaseClient: () => SupabaseClient<Database>;
/**
 * Get the service role Supabase client (bypasses RLS)
 * Use with caution - only for server-side operations
 */
export declare const getSupabaseServiceClient: () => SupabaseClient<Database>;
/**
 * Execute a database query with error handling
 */
export declare function executeQuery<T>(queryFn: (client: SupabaseClient<Database>) => Promise<{
    data: T | null;
    error: any;
}>): Promise<{
    data: T | null;
    error: string | null;
}>;
/**
 * Get the current user's organization ID
 */
export declare function getCurrentUserOrganizationId(): Promise<string | null>;
/**
 * Check if the current user has a specific role
 */
export declare function checkUserRole(role: string): Promise<boolean>;
/**
 * Batch insert with transaction support
 */
export declare function batchInsert<T>(tableName: keyof Database['public']['Tables'], records: T[], batchSize?: number): Promise<{
    success: number;
    errors: Array<{
        index: number;
        error: string;
    }>;
}>;
/**
 * Get paginated results with count
 */
export declare function getPaginatedResults<T>(queryBuilder: any, page?: number, perPage?: number): Promise<{
    data: T[];
    count: number;
    page: number;
    perPage: number;
    totalPages: number;
}>;
/**
 * Subscribe to real-time changes for a table
 */
export declare function subscribeToTableChanges<T>(tableName: string, callback: (payload: {
    eventType: 'INSERT' | 'UPDATE' | 'DELETE';
    new: T | null;
    old: T | null;
}) => void, filter?: string): () => void;
/**
 * Subscribe to user-specific changes (organization filtered)
 */
export declare function subscribeToUserChanges<T>(tableName: string, callback: (payload: {
    eventType: 'INSERT' | 'UPDATE' | 'DELETE';
    new: T | null;
    old: T | null;
}) => void): Promise<() => void>;
/**
 * Log an action for audit trail
 */
export declare function logAuditAction(tableName: string, recordId: string, action: 'INSERT' | 'UPDATE' | 'DELETE', oldValues?: Record<string, any>, newValues?: Record<string, any>): Promise<void>;
/**
 * Validate trust transaction before insertion
 */
export declare function validateTrustTransaction(clientId: string, matterId: string, trustAccountId: string, transactionType: 'deposit' | 'withdrawal' | 'transfer' | 'adjustment', amount: number): Promise<{
    valid: boolean;
    error?: string;
    availableBalance?: number;
}>;
/**
 * Format Supabase error for user display
 */
export declare function formatSupabaseError(error: any): string;
export { getSupabaseClient as supabase, getSupabaseServiceClient as supabaseService, };
export default getSupabaseClient;
//# sourceMappingURL=client.d.ts.map