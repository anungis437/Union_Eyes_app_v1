/**
 * MemberList Component
 *
 * Table/list of organization members with filtering and management.
 * Real-time updates, role display, and action buttons.
 *
 * @module MemberList
 */
import React from 'react';
import type { OrganizationMember } from '../services/organizationService';
export interface MemberListProps {
    /** Supabase client instance */
    supabase: any;
    /** Organization ID */
    organizationId: string;
    /** Enable real-time updates */
    enableRealtime?: boolean;
    /** Callback when invite button is clicked */
    onInviteClick?: () => void;
    /** Callback when member is clicked */
    onMemberClick?: (member: OrganizationMember) => void;
    /** Additional CSS classes */
    className?: string;
}
/**
 * Organization member list component
 *
 * @example
 * ```tsx
 * <MemberList
 *   supabase={supabase}
 *   organizationId={orgId}
 *   enableRealtime={true}
 *   onInviteClick={() => setShowInviteModal(true)}
 *   onMemberClick={(member) => setSelectedMember(member)}
 * />
 * ```
 */
export declare const MemberList: React.FC<MemberListProps>;
//# sourceMappingURL=MemberList.d.ts.map