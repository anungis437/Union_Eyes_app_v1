/**
 * Organization Management Hook
 *
 * React hook for managing organizations (tenants) with real-time updates.
 * Provides CRUD operations, organization switching, and member management.
 *
 * @module useOrganization
 */
import { SupabaseClient } from '@supabase/supabase-js';
import { OrganizationService, type Organization, type CreateOrganizationInput, type UpdateOrganizationInput } from '../services/organizationService';
export interface UseOrganizationOptions {
    /** Supabase client instance */
    supabase: SupabaseClient;
    /** Organization ID to load (optional, loads all if not provided) */
    organizationId?: string;
    /** Enable real-time updates via Supabase subscriptions */
    enableRealtime?: boolean;
    /** Auto-refresh interval in milliseconds (0 to disable) */
    refreshInterval?: number;
}
export interface UseOrganizationReturn {
    /** Current organization */
    currentOrganization: Organization | null;
    /** List of all user's organizations */
    organizations: Organization[];
    /** Loading state */
    isLoading: boolean;
    /** Error state */
    error: Error | null;
    /** Create new organization */
    createOrganization: (input: CreateOrganizationInput) => Promise<Organization | null>;
    /** Update organization */
    updateOrganization: (id: string, input: UpdateOrganizationInput) => Promise<Organization | null>;
    /** Delete organization (soft delete) */
    deleteOrganization: (id: string) => Promise<boolean>;
    /** Switch to different organization */
    switchOrganization: (id: string) => void;
    /** Refresh organizations list */
    refresh: () => Promise<void>;
    /** Organization service instance */
    service: OrganizationService;
}
/**
 * Hook for managing organizations
 *
 * @example
 * ```tsx
 * function OrganizationSelector() {
 *   const { organizations, currentOrganization, switchOrganization, isLoading } = useOrganization({
 *     supabase,
 *     enableRealtime: true,
 *   });
 *
 *   if (isLoading) return <div>Loading...</div>;
 *
 *   return (
 *     <select
 *       value={currentOrganization?.id}
 *       onChange={(e) => switchOrganization(e.target.value)}
 *     >
 *       {organizations.map(org => (
 *         <option key={org.id} value={org.id}>{org.name}</option>
 *       ))}
 *     </select>
 *   );
 * }
 * ```
 */
export declare function useOrganization(options: UseOrganizationOptions): UseOrganizationReturn;
//# sourceMappingURL=useOrganization.d.ts.map