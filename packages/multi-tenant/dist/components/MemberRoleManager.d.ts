/**
 * MemberRoleManager Component
 *
 * Modal for updating organization member roles and custom permissions.
 * Includes validation to prevent removing the last owner.
 *
 * @module MemberRoleManager
 */
import React from 'react';
import type { OrganizationMember } from '../services/organizationService';
export interface MemberRoleManagerProps {
    /** Supabase client instance */
    supabase: any;
    /** Organization ID */
    organizationId: string;
    /** Member ID to edit */
    memberId: string;
    /** Whether modal is open */
    isOpen: boolean;
    /** Callback when modal closes */
    onClose: () => void;
    /** Callback after successful update */
    onUpdate?: (member: OrganizationMember) => void;
}
/**
 * Member role manager component
 *
 * @example
 * ```tsx
 * const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
 *
 * <MemberRoleManager
 *   supabase={supabase}
 *   organizationId={orgId}
 *   memberId={selectedMemberId!}
 *   isOpen={!!selectedMemberId}
 *   onClose={() => setSelectedMemberId(null)}
 *   onUpdate={(member) => undefined}
 * />
 * ```
 */
export declare const MemberRoleManager: React.FC<MemberRoleManagerProps>;
//# sourceMappingURL=MemberRoleManager.d.ts.map