/**
 * Organization Management Hook
 *
 * React hook for managing organizations (tenants) with real-time updates.
 * Provides CRUD operations, organization switching, and member management.
 *
 * @module useOrganization
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { createOrganizationService, } from '../services/organizationService';
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
export function useOrganization(options) {
    const { supabase, organizationId, enableRealtime = false, refreshInterval = 0 } = options;
    // Service instance (memoized)
    const service = useMemo(() => createOrganizationService(supabase), [supabase]);
    // State
    const [organizations, setOrganizations] = useState([]);
    const [currentOrgId, setCurrentOrgId] = useState(organizationId);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    // Current organization (derived from state)
    const currentOrganization = useMemo(() => organizations.find(org => org.id === currentOrgId) || null, [organizations, currentOrgId]);
    // Load organizations
    const loadOrganizations = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const { data, error: err } = await service.listUserOrganizations();
            if (err) {
                throw err;
            }
            setOrganizations(data);
            // Set first org as current if none selected
            if (!currentOrgId && data.length > 0) {
                setCurrentOrgId(data[0].id);
            }
        }
        catch (err) {
            setError(err);
        }
        finally {
            setIsLoading(false);
        }
    }, [service, currentOrgId]);
    // Load specific organization
    const loadOrganization = useCallback(async (id) => {
        try {
            const { data, error: err } = await service.getOrganization(id);
            if (err) {
                throw err;
            }
            if (data) {
                setOrganizations(prev => {
                    const index = prev.findIndex(org => org.id === id);
                    if (index >= 0) {
                        const updated = [...prev];
                        updated[index] = data;
                        return updated;
                    }
                    return [...prev, data];
                });
            }
        }
        catch (err) {
            setError(err);
        }
    }, [service]);
    // Create organization
    const createOrganization = useCallback(async (input) => {
        try {
            setError(null);
            const { data, error: err } = await service.createOrganization(input);
            if (err) {
                throw err;
            }
            if (data) {
                setOrganizations(prev => [...prev, data]);
                setCurrentOrgId(data.id);
            }
            return data;
        }
        catch (err) {
            setError(err);
            return null;
        }
    }, [service]);
    // Update organization
    const updateOrganization = useCallback(async (id, input) => {
        try {
            setError(null);
            const { data, error: err } = await service.updateOrganization(id, input);
            if (err) {
                throw err;
            }
            if (data) {
                setOrganizations(prev => prev.map(org => (org.id === id ? data : org)));
            }
            return data;
        }
        catch (err) {
            setError(err);
            return null;
        }
    }, [service]);
    // Delete organization
    const deleteOrganization = useCallback(async (id) => {
        try {
            setError(null);
            const { success, error: err } = await service.deleteOrganization(id);
            if (err) {
                throw err;
            }
            if (success) {
                setOrganizations(prev => prev.filter(org => org.id !== id));
                // Switch to another org if current was deleted
                if (currentOrgId === id) {
                    const remaining = organizations.filter(org => org.id !== id);
                    setCurrentOrgId(remaining[0]?.id);
                }
            }
            return success;
        }
        catch (err) {
            setError(err);
            return false;
        }
    }, [service, currentOrgId, organizations]);
    // Switch organization
    const switchOrganization = useCallback((id) => {
        setCurrentOrgId(id);
        // Store in localStorage for persistence
        try {
            localStorage.setItem('courtlens_current_organization', id);
        }
        catch {
            // Ignore storage errors
        }
        // Set cookie with organization slug for API access
        const org = organizations.find(o => o.id === id);
        if (org) {
            try {
                document.cookie = `active-organization=${org.slug}; path=/; max-age=${60 * 60 * 24 * 30}`; // 30 days
            }
            catch {
                // Ignore cookie errors
            }
        }
    }, [organizations]);
    // Refresh
    const refresh = useCallback(async () => {
        await loadOrganizations();
    }, [loadOrganizations]);
    // Initial load
    useEffect(() => {
        loadOrganizations();
    }, [loadOrganizations]);
    // Set cookie when current organization changes
    useEffect(() => {
        console.log('[useOrganization] Setting cookie - currentOrganization:', currentOrganization);
        if (currentOrganization) {
            try {
                const cookieValue = `active-organization=${currentOrganization.slug}; path=/; max-age=${60 * 60 * 24 * 30}`;
                console.log('[useOrganization] Setting cookie:', cookieValue);
                document.cookie = cookieValue; // 30 days
                console.log('[useOrganization] Cookie set successfully');
            }
            catch (error) {
                console.error('[useOrganization] Error setting cookie:', error);
            }
        }
        else {
            console.log('[useOrganization] No current organization, skipping cookie');
        }
    }, [currentOrganization]);
    // Load specific organization if ID provided
    useEffect(() => {
        if (organizationId) {
            loadOrganization(organizationId);
        }
    }, [organizationId, loadOrganization]);
    // Auto-refresh
    useEffect(() => {
        if (refreshInterval > 0) {
            const interval = setInterval(refresh, refreshInterval);
            return () => clearInterval(interval);
        }
    }, [refreshInterval, refresh]);
    // Real-time subscription
    useEffect(() => {
        if (!enableRealtime)
            return;
        let channel = null;
        const setupRealtime = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user)
                    return;
                channel = supabase
                    .channel('organization-changes')
                    .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'organizations',
                }, async (payload) => {
                    console.log('Organization change:', payload);
                    await refresh();
                })
                    .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'organization_members',
                    filter: `user_id=eq.${user.id}`,
                }, async (payload) => {
                    console.log('Membership change:', payload);
                    await refresh();
                })
                    .subscribe();
            }
            catch (err) {
                console.error('Failed to setup realtime:', err);
            }
        };
        setupRealtime();
        return () => {
            if (channel) {
                supabase.removeChannel(channel);
            }
        };
    }, [enableRealtime, supabase, refresh]);
    // Restore current organization from localStorage
    useEffect(() => {
        if (!currentOrgId && organizations.length > 0) {
            try {
                const stored = localStorage.getItem('courtlens_current_organization');
                if (stored && organizations.some(org => org.id === stored)) {
                    setCurrentOrgId(stored);
                }
            }
            catch {
                // Ignore storage errors
            }
        }
    }, [currentOrgId, organizations]);
    return {
        currentOrganization,
        organizations,
        isLoading,
        error,
        createOrganization,
        updateOrganization,
        deleteOrganization,
        switchOrganization,
        refresh,
        service,
    };
}
//# sourceMappingURL=useOrganization.js.map