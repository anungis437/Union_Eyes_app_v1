/**
 * InvitationList Component
 *
 * Display and manage user invitations
 */
import { Invitation } from '../services/invitationService';
interface InvitationListProps {
    invitations: Invitation[];
    isLoading: boolean;
    onResend: (invitationId: string) => Promise<boolean>;
    onCancel: (invitationId: string, cancelledBy: string) => Promise<boolean>;
    onDelete: (invitationId: string) => Promise<boolean>;
    currentUserId: string;
    showActions?: boolean;
}
export declare function InvitationList({ invitations, isLoading, onResend, onCancel, onDelete, currentUserId, showActions, }: InvitationListProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=InvitationList.d.ts.map