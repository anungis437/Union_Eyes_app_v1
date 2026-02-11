/**
 * @fileoverview Supabase Configuration and Database Helper
 *
 * This module provides the Supabase client configuration and helper functions
 * for interacting with the CourtLens billing database.
 */
import { createClient } from '@supabase/supabase-js';
const getSupabaseConfig = () => {
    let url = 'http://127.0.0.1:54321'; // Local development fallback
    let anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'; // Local development anon key
    let serviceRoleKey;
    // Try Vite environment variables first (import.meta.env)
    if (typeof import.meta !== 'undefined' && import.meta.env) {
        url = import.meta.env.VITE_SUPABASE_URL || url;
        anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || anonKey;
    }
    // Try Next.js/Node environment variables (process.env) with safe access
    try {
        if (typeof process !== 'undefined' && process.env) {
            url = process.env.NEXT_PUBLIC_SUPABASE_URL || url;
            anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || anonKey;
            serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        }
    }
    catch (e) {
        // process is not defined in browser, continue with defaults
    }
    return {
        url,
        anonKey,
        serviceRoleKey,
    };
};
// =========================================================================
// SUPABASE CLIENT INSTANCES
// =========================================================================
let supabaseClient = null;
let supabaseServiceClient = null;
/**
 * Get the public Supabase client (with RLS)
 */
export const getSupabaseClient = () => {
    if (!supabaseClient) {
        const config = getSupabaseConfig();
        supabaseClient = createClient(config.url, config.anonKey, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true,
            },
            db: {
                schema: 'public',
            },
            global: {
                headers: {
                    'x-application-name': 'CourtLens',
                },
            },
        });
    }
    return supabaseClient;
};
/**
 * Get the service role Supabase client (bypasses RLS)
 * Use with caution - only for server-side operations
 */
export const getSupabaseServiceClient = () => {
    if (!supabaseServiceClient) {
        const config = getSupabaseConfig();
        if (!config.serviceRoleKey) {
            throw new Error('Service role key not configured');
        }
        supabaseServiceClient = createClient(config.url, config.serviceRoleKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
            db: {
                schema: 'public',
            },
        });
    }
    return supabaseServiceClient;
};
// =========================================================================
// DATABASE HELPER FUNCTIONS
// =========================================================================
/**
 * Execute a database query with error handling
 */
export async function executeQuery(queryFn) {
    try {
        const client = getSupabaseClient();
        const result = await queryFn(client);
        if (result.error) {
            return {
                data: null,
                error: result.error.message || 'Database operation failed',
            };
        }
        return {
            data: result.data,
            error: null,
        };
    }
    catch (error) {
        return {
            data: null,
            error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
    }
}
/**
 * Get the current user's organization ID
 */
export async function getCurrentUserOrganizationId() {
    const client = getSupabaseClient();
    try {
        // First try to get from user metadata
        const { data: { user } } = await client.auth.getUser();
        if (user?.user_metadata?.organization_id) {
            return user.user_metadata.organization_id;
        }
        // Fallback to database lookup
        if (user?.id) {
            const { data: userData } = await client
                .from('users')
                .select('organization_id')
                .eq('id', user.id)
                .single();
            return userData?.organization_id || null;
        }
        return null;
    }
    catch (error) {
        return null;
    }
}
/**
 * Check if the current user has a specific role
 */
export async function checkUserRole(role) {
    const client = getSupabaseClient();
    try {
        const { data: { user } } = await client.auth.getUser();
        if (!user)
            return false;
        const { data: userData } = await client
            .from('users')
            .select('role, is_active')
            .eq('id', user.id)
            .single();
        const userRecord = userData;
        return userRecord?.role === role && userRecord?.is_active === true;
    }
    catch (error) {
        return false;
    }
}
/**
 * Batch insert with transaction support
 */
export async function batchInsert(tableName, records, batchSize = 100) {
    const client = getSupabaseClient();
    const results = { success: 0, errors: [] };
    for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        try {
            const { error } = await client
                .from(tableName)
                .insert(batch);
            if (error) {
                batch.forEach((_, batchIndex) => {
                    results.errors.push({
                        index: i + batchIndex,
                        error: error.message,
                    });
                });
            }
            else {
                results.success += batch.length;
            }
        }
        catch (error) {
            batch.forEach((_, batchIndex) => {
                results.errors.push({
                    index: i + batchIndex,
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            });
        }
    }
    return results;
}
/**
 * Get paginated results with count
 */
export async function getPaginatedResults(queryBuilder, page = 1, perPage = 50) {
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;
    const { data, error, count } = await queryBuilder
        .range(from, to)
        .order('created_at', { ascending: false });
    if (error) {
        // Preserve original error object with stack trace
        throw error;
    }
    const totalPages = count ? Math.ceil(count / perPage) : 0;
    return {
        data: data || [],
        count: count || 0,
        page,
        perPage,
        totalPages,
    };
}
// =========================================================================
// REAL-TIME SUBSCRIPTIONS
// =========================================================================
/**
 * Subscribe to real-time changes for a table
 */
export function subscribeToTableChanges(tableName, callback, filter) {
    const client = getSupabaseClient();
    const subscription = client
        .channel(`${tableName}_changes`)
        .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: tableName,
        filter: filter
    }, (payload) => {
        callback({
            eventType: payload.eventType,
            new: payload.new,
            old: payload.old,
        });
    });
    subscription.subscribe();
    return () => {
        subscription.unsubscribe();
    };
}
/**
 * Subscribe to user-specific changes (organization filtered)
 */
export async function subscribeToUserChanges(tableName, callback) {
    const organizationId = await getCurrentUserOrganizationId();
    if (!organizationId) {
        throw new Error('User organization not found');
    }
    return subscribeToTableChanges(tableName, callback, `organization_id=eq.${organizationId}`);
}
// =========================================================================
// AUDIT LOGGING
// =========================================================================
/**
 * Log an action for audit trail
 */
export async function logAuditAction(tableName, recordId, action, oldValues, newValues) {
    const client = getSupabaseClient();
    const organizationId = await getCurrentUserOrganizationId();
    if (!organizationId) {
        return;
    }
    const { data: { user } } = await client.auth.getUser();
    const changedFields = oldValues && newValues
        ? Object.keys(newValues).filter(key => oldValues[key] !== newValues[key])
        : undefined;
    try {
        const auditData = {
            organization_id: organizationId,
            table_name: tableName,
            record_id: recordId,
            action,
            old_values: oldValues || null,
            new_values: newValues || null,
            changed_fields: changedFields,
            user_id: user?.id,
            ip_address: null, // Would be populated server-side
            user_agent: null, // Would be populated server-side
        };
        await client.from('audit_log').insert(auditData);
    }
    catch (error) {
        // Don't throw - audit logging shouldn't break the main operation
    }
}
// =========================================================================
// TRUST ACCOUNT HELPERS (IOLTA Compliance)
// =========================================================================
/**
 * Validate trust transaction before insertion
 */
export async function validateTrustTransaction(clientId, matterId, trustAccountId, transactionType, amount) {
    if (transactionType === 'withdrawal' && amount > 0) {
        const client = getSupabaseClient();
        // Get current trust balance for client/matter
        const { data: ledger } = await client
            .from('trust_ledger')
            .select('balance')
            .eq('client_id', clientId)
            .eq('matter_id', matterId)
            .eq('trust_account_id', trustAccountId)
            .single();
        const trustLedger = ledger;
        const availableBalance = trustLedger?.balance || 0;
        if (amount > availableBalance) {
            return {
                valid: false,
                error: `Insufficient trust funds. Available: $${availableBalance.toFixed(2)}, Requested: $${amount.toFixed(2)}`,
                availableBalance,
            };
        }
        return { valid: true, availableBalance };
    }
    return { valid: true };
}
// =========================================================================
// ERROR HANDLING UTILITIES
// =========================================================================
/**
 * Format Supabase error for user display
 */
export function formatSupabaseError(error) {
    if (!error)
        return 'Unknown error occurred';
    // Handle common Supabase error patterns
    if (error.code === 'PGRST301') {
        return 'Record not found or access denied';
    }
    if (error.code === 'PGRST204') {
        return 'No data returned from query';
    }
    if (error.code === '23505') {
        return 'A record with this information already exists';
    }
    if (error.code === '23503') {
        return 'Cannot delete: record is referenced by other data';
    }
    if (error.code === '42501') {
        return 'Access denied: insufficient permissions';
    }
    return error.message || 'Database operation failed';
}
// =========================================================================
// EXPORTS
// =========================================================================
export { getSupabaseClient as supabase, getSupabaseServiceClient as supabaseService, };
export default getSupabaseClient;
//# sourceMappingURL=client.js.map