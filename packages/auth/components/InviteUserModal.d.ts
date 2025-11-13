/**
 * InviteUserModal Component
 *
 * Modal for inviting new users to an organization
 */
import { InvitationCreate } from '../services/invitationService';
interface InviteUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onInvite: (data: InvitationCreate, invitedBy: string) => Promise<boolean>;
    organizationId: string;
    currentUserId: string;
    availableRoles?: Array<{
        value: string;
        label: string;
    }>;
    availablePermissions?: Array<{
        value: string;
        label: string;
        description?: string;
    }>;
}
export declare function InviteUserModal({ isOpen, onClose, onInvite, organizationId, currentUserId, availableRoles, availablePermissions, }: InviteUserModalProps): import("react/jsx-runtime").JSX.Element | null;
export {};
//# sourceMappingURL=InviteUserModal.d.ts.map