/**
 * InviteMemberModal Component
 *
 * Modal dialog for inviting new members to an organization.
 * Includes email validation, role selection, and optional profile fields.
 *
 * @module InviteMemberModal
 */
import React from 'react';
export interface InviteMemberModalProps {
    /** Supabase client instance */
    supabase: any;
    /** Organization ID */
    organizationId: string;
    /** Whether modal is open */
    isOpen: boolean;
    /** Callback to close modal */
    onClose: () => void;
    /** Callback when member is invited */
    onInvite?: (memberId: string) => void;
    /** Additional CSS classes */
    className?: string;
}
/**
 * Modal for inviting new members
 *
 * @example
 * ```tsx
 * const [showModal, setShowModal] = useState(false);
 *
 * <InviteMemberModal
 *   supabase={supabase}
 *   organizationId={orgId}
 *   isOpen={showModal}
 *   onClose={() => setShowModal(false)}
 *   onInvite={(id) => toast.success('Member invited')}
 * />
 * ```
 */
export declare const InviteMemberModal: React.FC<InviteMemberModalProps>;
//# sourceMappingURL=InviteMemberModal.d.ts.map