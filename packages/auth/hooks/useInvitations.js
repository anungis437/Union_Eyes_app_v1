/**
 * useInvitations Hook
 *
 * React hook for managing user invitations
 */
import { useState, useEffect, useCallback } from 'react';
import { InvitationService } from '../services/invitationService';
export function useInvitations(options = {}) {
    const { organizationId, autoFetch = true, filterStatus, } = options;
    const [invitations, setInvitations] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    // Initialize service
    const service = new InvitationService((typeof window !== 'undefined' && window.import?.meta?.env?.VITE_SUPABASE_URL) ||
        process.env.NEXT_PUBLIC_SUPABASE_URL ||
        'http://localhost:54321', (typeof window !== 'undefined' && window.import?.meta?.env?.VITE_SUPABASE_ANON_KEY) ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        '', typeof window !== 'undefined' ? window.location.origin : '');
    // Fetch invitations
    const fetchInvitations = useCallback(async () => {
        if (!organizationId) {
            setInvitations([]);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const result = await service.listInvitations(organizationId, filterStatus);
            setInvitations(result);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to fetch invitations';
            setError(message);
}
        finally {
            setIsLoading(false);
        }
    }, [organizationId, filterStatus]);
    // Auto-fetch on mount and when dependencies change
    useEffect(() => {
        if (autoFetch && organizationId) {
            fetchInvitations();
        }
    }, [autoFetch, organizationId, filterStatus, fetchInvitations]);
    // Create invitation
    const createInvitation = async (data, invitedBy) => {
        setError(null);
        try {
            const invitation = await service.createInvitation(data, invitedBy);
            if (invitation) {
                // Add to local state
                setInvitations(prev => [invitation, ...prev]);
                return invitation;
            }
            return null;
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to create invitation';
            setError(message);
return null;
        }
    };
    // Cancel invitation
    const cancelInvitation = async (invitationId, cancelledBy) => {
        setError(null);
        try {
            const success = await service.cancelInvitation(invitationId, cancelledBy);
            if (success) {
                // Update local state
                setInvitations(prev => prev.map(inv => inv.id === invitationId
                    ? { ...inv, status: 'cancelled', cancelled_at: new Date().toISOString(), cancelled_by: cancelledBy }
                    : inv));
            }
            return success;
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to cancel invitation';
            setError(message);
return false;
        }
    };
    // Resend invitation
    const resendInvitation = async (invitationId) => {
        setError(null);
        try {
            const success = await service.resendInvitation(invitationId);
            if (success) {
                // Refresh to get updated token and expiry
                await fetchInvitations();
            }
            return success;
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to resend invitation';
            setError(message);
return false;
        }
    };
    // Delete invitation
    const deleteInvitation = async (invitationId) => {
        setError(null);
        try {
            const success = await service.deleteInvitation(invitationId);
            if (success) {
                // Remove from local state
                setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
            }
            return success;
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to delete invitation';
            setError(message);
return false;
        }
    };
    // Accept invitation
    const acceptInvitation = async (data) => {
        setError(null);
        try {
            return await service.acceptInvitation(data);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to accept invitation';
            setError(message);
return { success: false, error: message };
        }
    };
    // Refresh invitations
    const refresh = async () => {
        await fetchInvitations();
    };
    // Calculate stats
    const stats = {
        total: invitations.length,
        pending: invitations.filter(inv => inv.status === 'pending').length,
        accepted: invitations.filter(inv => inv.status === 'accepted').length,
        expired: invitations.filter(inv => inv.status === 'expired').length,
        cancelled: invitations.filter(inv => inv.status === 'cancelled').length,
    };
    return {
        invitations,
        isLoading,
        error,
        createInvitation,
        cancelInvitation,
        resendInvitation,
        deleteInvitation,
        acceptInvitation,
        refresh,
        stats,
    };
}
//# sourceMappingURL=useInvitations.js.map