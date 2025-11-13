/**
 * Organization Members Hook
 *
 * React hook for managing organization members with real-time updates.
 * Provides member CRUD operations, role management, and activity tracking.
 *
 * @module useOrganizationMembers
 */
import { SupabaseClient } from '@supabase/supabase-js';
import { type OrganizationMember, type AddMemberInput, type UpdateMemberInput, type MemberRole } from '../services/organizationService';
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
export declare function useOrganizationMembers(options: UseOrganizationMembersOptions): UseOrganizationMembersReturn;
//# sourceMappingURL=useOrganizationMembers.d.ts.map