/**
 * Organization Members Hook
 * 
 * React hook for managing organization members with real-time updates.
 * Provides member CRUD operations, role management, and activity tracking.
 * 
 * @module useOrganizationMembers
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import {
  OrganizationService,
  createOrganizationService,
  type OrganizationMember,
  type AddMemberInput,
  type UpdateMemberInput,
  type MemberRole,
} from '../services/organizationService';

export interface UseOrganizationMembersOptions {
  /** Supabase client instance */
  supabase: SupabaseClient;
  
  /** Organization ID to manage members for */
  organizationId: string;
  
  /** Enable real-time updates via Supabase subscriptions */
  enableRealtime?: boolean;
  
  /** Auto-refresh interval in milliseconds (0 to disable) */
  refreshInterval?: number;
  
  /** Include suspended members */
  includeSuspended?: boolean;
}

export interface UseOrganizationMembersReturn {
  /** Array of organization members */
  members: OrganizationMember[];
  
  /** Current user's membership info */
  currentUserMember: OrganizationMember | null;
  
  /** Loading state */
  isLoading: boolean;
  
  /** Error state */
  error: Error | null;
  
  /** Add member to organization */
  addMember: (input: AddMemberInput) => Promise<OrganizationMember | null>;
  
  /** Update member role/permissions */
  updateMember: (memberId: string, input: UpdateMemberInput) => Promise<OrganizationMember | null>;
  
  /** Remove member from organization */
  removeMember: (memberId: string) => Promise<boolean>;
  
  /** Get members by role */
  getMembersByRole: (role: MemberRole) => OrganizationMember[];
  
  /** Check if current user has specific role */
  hasRole: (role: MemberRole | MemberRole[]) => boolean;
  
  /** Check if current user is owner or admin */
  isOwnerOrAdmin: boolean;
  
  /** Refresh members list */
  refresh: () => Promise<void>;
  
  /** Total member count */
  memberCount: number;
  
  /** Active member count */
  activeMemberCount: number;
}

/**
 * Hook for managing organization members
 * 
 * @example
 * ```tsx
 * function MemberList({ organizationId }: { organizationId: string }) {
 *   const {
 *     members,
 *     isLoading,
 *     addMember,
 *     removeMember,
 *     isOwnerOrAdmin,
 *   } = useOrganizationMembers({
 *     supabase,
 *     organizationId,
 *     enableRealtime: true,
 *   });
 *   
 *   if (isLoading) return <div>Loading members...</div>;
 *   
 *   return (
 *     <div>
 *       <h2>Members ({members.length})</h2>
 *       {members.map(member => (
 *         <div key={member.id}>
 *           {member.user?.email} - {member.role}
 *           {isOwnerOrAdmin && (
 *             <button onClick={() => removeMember(member.id)}>Remove</button>
 *           )}
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useOrganizationMembers(
  options: UseOrganizationMembersOptions
): UseOrganizationMembersReturn {
  const {
    supabase,
    organizationId,
    enableRealtime = false,
    refreshInterval = 0,
    includeSuspended = false,
  } = options;

  // Service instance (memoized)
  const service = useMemo(() => createOrganizationService(supabase), [supabase]);

  // State
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Filtered members
  const filteredMembers = useMemo(() => {
    if (includeSuspended) return members;
    return members.filter(m => m.status === 'active');
  }, [members, includeSuspended]);

  // Current user's membership
  const currentUserMember = useMemo(
    () => members.find(m => m.user_id === currentUserId) || null,
    [members, currentUserId]
  );

  // Member counts
  const memberCount = filteredMembers.length;
  const activeMemberCount = members.filter(m => m.status === 'active').length;

  // Load current user
  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    };
    loadUser();
  }, [supabase]);

  // Load members
  const loadMembers = useCallback(async () => {
    if (!organizationId) return;

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: err } = await service.listMembers(organizationId);

      if (err) {
        throw err;
      }

      setMembers(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [service, organizationId]);

  // Add member
  const addMember = useCallback(async (input: AddMemberInput): Promise<OrganizationMember | null> => {
    try {
      setError(null);

      const { data, error: err } = await service.addMember(organizationId, input);

      if (err) {
        throw err;
      }

      if (data) {
        setMembers(prev => [...prev, data]);
      }

      return data;
    } catch (err) {
      setError(err as Error);
      return null;
    }
  }, [service, organizationId]);

  // Update member
  const updateMember = useCallback(async (
    memberId: string,
    input: UpdateMemberInput
  ): Promise<OrganizationMember | null> => {
    try {
      setError(null);

      const { data, error: err } = await service.updateMember(organizationId, memberId, input);

      if (err) {
        throw err;
      }

      if (data) {
        setMembers(prev =>
          prev.map(m => (m.id === memberId ? data : m))
        );
      }

      return data;
    } catch (err) {
      setError(err as Error);
      return null;
    }
  }, [service, organizationId]);

  // Remove member
  const removeMember = useCallback(async (memberId: string): Promise<boolean> => {
    try {
      setError(null);

      const { success, error: err } = await service.removeMember(organizationId, memberId);

      if (err) {
        throw err;
      }

      if (success) {
        setMembers(prev => prev.filter(m => m.id !== memberId));
      }

      return success;
    } catch (err) {
      setError(err as Error);
      return false;
    }
  }, [service, organizationId]);

  // Get members by role
  const getMembersByRole = useCallback((role: MemberRole): OrganizationMember[] => {
    return filteredMembers.filter(m => m.role === role);
  }, [filteredMembers]);

  // Check if current user has role
  const hasRole = useCallback((role: MemberRole | MemberRole[]): boolean => {
    if (!currentUserMember) return false;
    
    const roles = Array.isArray(role) ? role : [role];
    return roles.includes(currentUserMember.role);
  }, [currentUserMember]);

  // Check if owner or admin
  const isOwnerOrAdmin = useMemo(
    () => hasRole(['owner', 'admin']),
    [hasRole]
  );

  // Refresh
  const refresh = useCallback(async () => {
    await loadMembers();
  }, [loadMembers]);

  // Initial load
  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  // Auto-refresh
  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(refresh, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval, refresh]);

  // Real-time subscription
  useEffect(() => {
    if (!enableRealtime || !organizationId) return;

    let channel: RealtimeChannel | null = null;

    const setupRealtime = async () => {
      try {
        channel = supabase
          .channel(`organization-members-${organizationId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'organization_members',
              filter: `organization_id=eq.${organizationId}`,
            },
            async (payload) => {
              console.log('Member change:', payload);
              await refresh();
            }
          )
          .subscribe();
      } catch (err) {
        console.error('Failed to setup realtime:', err);
      }
    };

    setupRealtime();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [enableRealtime, organizationId, supabase, refresh]);

  return {
    members: filteredMembers,
    currentUserMember,
    isLoading,
    error,
    addMember,
    updateMember,
    removeMember,
    getMembersByRole,
    hasRole,
    isOwnerOrAdmin,
    refresh,
    memberCount,
    activeMemberCount,
  };
}
