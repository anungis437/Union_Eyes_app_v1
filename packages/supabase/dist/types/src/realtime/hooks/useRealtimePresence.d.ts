/**
 * Real-time Presence Hook
 *
 * React hook for tracking user presence and online status
 * across the CourtLens application.
 */
import { PresenceState } from '../RealtimeService';
export interface UseRealtimePresenceProps {
    organizationId: string;
    user: {
        id: string;
        name: string;
        avatar?: string;
    };
    enabled?: boolean;
}
export interface UseRealtimePresenceReturn {
    onlineUsers: PresenceState[];
    isConnected: boolean;
    updateActivity: (activity: {
        currentPage?: string;
        activeDocument?: string;
        activeMatter?: string;
    }) => Promise<void>;
    getUsersInDocument: (documentId: string) => PresenceState[];
    getUsersInMatter: (matterId: string) => PresenceState[];
}
export declare function useRealtimePresence({ organizationId, user, enabled }: UseRealtimePresenceProps): UseRealtimePresenceReturn;
//# sourceMappingURL=useRealtimePresence.d.ts.map