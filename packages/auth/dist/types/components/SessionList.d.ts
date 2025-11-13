/**
 * Session List Component
 *
 * List of all sessions with filtering and sorting
 */
import React from 'react';
import { SessionInfo } from '../services/sessionManagement';
interface SessionListProps {
    sessions: SessionInfo[];
    currentSessionId?: string;
    onTerminateSession?: (sessionId: string) => void;
    onTerminateOthers?: () => void;
    isLoading?: boolean;
    showTerminateButtons?: boolean;
}
export declare const SessionList: React.FC<SessionListProps>;
export {};
//# sourceMappingURL=SessionList.d.ts.map