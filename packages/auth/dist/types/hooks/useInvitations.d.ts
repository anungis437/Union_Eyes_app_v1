/**
 * useInvitations Hook
 *
 * React hook for managing user invitations
 */
import { Invitation, InvitationCreate, InvitationAccept } from '../services/invitationService';
interface UseInvitationsOptions {
    organizationId?: string;
    autoFetch?: boolean;
    filterStatus?: 'pending' | 'accepted' | 'cancelled' | 'expired';
}
interface UseInvitationsReturn {
    invitations: Invitation[];
    isLoading: boolean;
    error: string | null;
    createInvitation: (data: InvitationCreate, invitedBy: string) => Promise<Invitation | null>;
    cancelInvitation: (invitationId: string, cancelledBy: string) => Promise<boolean>;
    resendInvitation: (invitationId: string) => Promise<boolean>;
    deleteInvitation: (invitationId: string) => Promise<boolean>;
    acceptInvitation: (data: InvitationAccept) => Promise<{
        success: boolean;
        userId?: string;
        error?: string;
    }>;
    refresh: () => Promise<void>;
    stats: {
        total: number;
        pending: number;
        accepted: number;
        expired: number;
        cancelled: number;
    };
}
export declare function useInvitations(options?: UseInvitationsOptions): UseInvitationsReturn;
export {};
//# sourceMappingURL=useInvitations.d.ts.map